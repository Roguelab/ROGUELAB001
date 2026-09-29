const express=require("express"),path=require("path"),fs=require("fs"),jwt=require("jsonwebtoken"),QRCode=require("qrcode");
const app=express(),PORT=process.env.PORT||3000,ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"CHANGE_THIS_PASSWORD",JWT_SECRET=process.env.JWT_SECRET||"CHANGE_THIS_SECRET";
const file=path.join(__dirname,"data","packages.json");
app.use(express.json()); app.use(express.static(path.join(__dirname,"public")));
function read(){try{return JSON.parse(fs.readFileSync(file))}catch{return {packages:{}}}}
function write(x){fs.writeFileSync(file,JSON.stringify(x,null,2))}
function auth(req,res,next){try{req.user=jwt.verify((req.headers.authorization||"").replace("Bearer ",""),JWT_SECRET);next()}catch{res.status(401).json({error:"Unauthorized"})}}
function norm(p){return {id:String(p.id||"").toUpperCase(),status:p.status||"Preparing",product:p.product||"",quantity:Number(p.quantity||1),weight:p.weight||"",declaredValue:p.declaredValue||"",origin:p.origin||"Sri Lanka",destination:p.destination||"",tracking:p.tracking||"",estimatedDelivery:p.estimatedDelivery||"",updatedAt:new Date().toISOString().slice(0,10)}}
app.get("/api/package/:id",(req,res)=>{let p=read().packages[String(req.params.id).toUpperCase()];p?res.json(p):res.status(404).json({error:"Package not found"})});
app.post("/api/admin/login",(req,res)=>req.body.password===ADMIN_PASSWORD?res.json({token:jwt.sign({role:"admin"},JWT_SECRET,{expiresIn:"7d"})}):res.status(401).json({error:"Wrong password"}));
app.get("/api/admin/packages",auth,(req,res)=>res.json(Object.values(read().packages)));
app.post("/api/admin/packages",auth,(req,res)=>{let s=read(),id=String(req.body.id||"").trim().toUpperCase();if(!/^[A-Z0-9_-]{3,40}$/.test(id))return res.status(400).json({error:"Invalid Package ID"});if(s.packages[id])return res.status(409).json({error:"Package ID already exists"});let p=norm({...req.body,id});s.packages[id]=p;write(s);res.json(p)});
app.put("/api/admin/packages/:id",auth,(req,res)=>{let s=read(),id=String(req.params.id).toUpperCase();if(!s.packages[id])return res.status(404).json({error:"Package not found"});s.packages[id]=norm({...s.packages[id],...req.body,id});write(s);res.json(s.packages[id])});
app.delete("/api/admin/packages/:id",auth,(req,res)=>{let s=read(),id=String(req.params.id).toUpperCase();delete s.packages[id];write(s);res.json({ok:true})});
app.get("/api/package/:id/qr",async(req,res)=>{let id=String(req.params.id).toUpperCase();if(!read().packages[id])return res.status(404).send("Package not found");let url=`${req.protocol}://${req.get("host")}/p/${encodeURIComponent(id)}`;res.type("png").send(await QRCode.toBuffer(url,{width:900,margin:2,errorCorrectionLevel:"H"}))});
app.get("/p/:id",(req,res)=>res.sendFile(path.join(__dirname,"public","package.html")));
app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.get("/",(req,res)=>res.redirect("/admin"));
app.listen(PORT,()=>console.log("ROGUELAB QR manager on "+PORT));