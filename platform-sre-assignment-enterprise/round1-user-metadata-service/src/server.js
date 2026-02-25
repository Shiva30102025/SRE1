
const express = require("express");
const { Pool } = require("pg");
const CircuitBreaker = require("opossum");
const pino = require("pino");
const client = require("prom-client");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

const logger = pino();

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP Requests",
  labelNames: ["method", "route", "status"]
});

const latencyHistogram = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Request latency",
  buckets: [50,100,200,300,500,1000],
  labelNames: ["method","route"]
});

register.registerMetric(requestCounter);
register.registerMetric(latencyHistogram);

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const breaker = new CircuitBreaker((q,p)=>pool.query(q,p),{
  timeout:3000,
  errorThresholdPercentage:50,
  resetTimeout:10000
});

async function retry(fn, retries=5){
  for(let i=0;i<retries;i++){
    try{ return await fn(); }
    catch(e){
      const delay=(2**i*100)+Math.random()*100;
      await new Promise(r=>setTimeout(r,delay));
    }
  }
  throw new Error("DB failure after retries");
}

app.use((req,res,next)=>{
  req.request_id=uuidv4();
  res.setHeader("X-Request-ID",req.request_id);
  next();
});

app.get("/health",(req,res)=>res.json({status:"ok"}));

app.post("/user",async(req,res)=>{
  const end=latencyHistogram.startTimer({method:"POST",route:"/user"});
  try{
    const key=req.headers["idempotency-key"];
    if(!key) return res.status(400).json({error:"Idempotency-Key required"});

    const existing=await pool.query("SELECT response FROM idempotency_keys WHERE key=$1",[key]);
    if(existing.rows.length){
      requestCounter.inc({method:"POST",route:"/user",status:200});
      return res.json(existing.rows[0].response);
    }

    const {user_id,name,email,phone}=req.body;
    const created_at=new Date();

    await retry(()=>breaker.fire(
      "INSERT INTO users(user_id,name,email,phone,created_at) VALUES($1,$2,$3,$4,$5)",
      [user_id,name,email,phone,created_at]
    ));

    const response={user_id,name,email,phone,created_at};
    await pool.query("INSERT INTO idempotency_keys(key,response) VALUES($1,$2)",[key,response]);

    requestCounter.inc({method:"POST",route:"/user",status:200});
    res.json(response);
  }catch(err){
    logger.error({request_id:req.request_id,error:err.message});
    requestCounter.inc({method:"POST",route:"/user",status:500});
    res.status(500).json({error:err.message});
  }finally{ end(); }
});

app.get("/metrics",async(req,res)=>{
  res.set("Content-Type",register.contentType);
  res.end(await register.metrics());
});

process.on("SIGTERM",()=>{
  logger.info("Graceful shutdown");
  process.exit(0);
});

app.listen(3000,()=>console.log("Enterprise User Service running"));
