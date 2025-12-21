# War Thunder Auto Skin - Demo & Deployment Guide

## 🚀 Demo แบบชั่วคราว (สำหรับโชว์)

### ใช้ ngrok (แนะนำ - ง่ายที่สุด)
```bash
# 1. รัน server
npm start

# 2. เปิด terminal ใหม่
ngrok http 3000
```
จะได้ URL: `https://xxxx.ngrok-free.app` แชร์ให้คนอื่นใช้ได้เลย!

### ใช้ Cloudflare Tunnel (ฟรี ไม่จำกัดเวลา)
```bash
npm start
cloudflared tunnel --url http://localhost:3000
```

---

## 🌐 Deploy สาธารณะ (24/7 Online)

### Railway.app (แนะนำ - ง่ายที่สุด)
1. สมัคร: https://railway.app
2. Connect GitHub
3. New Project → Deploy from GitHub
4. เลือก repo: `AUMTERDUM/WarthunderEZinstallskin`
5. Railway จะ deploy อัตโนมัติ ✅

**Free Tier**: $5 credit/month (~500 hours)

### Render.com
1. สมัคร: https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`

**Free Tier**: 750 hours/month

### Fly.io
```bash
# ติดตั้ง flyctl
npm install -g flyctl

# Login
fly auth login

# Deploy
fly launch
fly deploy
```

**Free Tier**: 3GB persistent disk

---

## 📝 หมายเหตุสำคัญ

⚠️ **File Upload Limitation**:
- Web app นี้รองรับ local file system
- เมื่อ deploy บน cloud ไฟล์ที่ extract จะอยู่บน server
- ผู้ใช้ต้อง download ไฟล์จาก server มาติดตั้งเอง

### แนวทางแก้ไข (สำหรับ production):
1. เพิ่ม download button หลัง extract
2. ใช้ temporary storage (ลบไฟล์หลังดาวน์โหลด)
3. หรือแนะนำให้ผู้ใช้รัน local (npm start)

---

## 🎯 แนะนำสำหรับการใช้งานจริง

**สำหรับคนทั่วไป**: แนะนำให้ download code และรันเอง
```bash
git clone https://github.com/AUMTERDUM/WarthunderEZinstallskin.git
cd WarthunderEZinstallskin
npm install
npm start
```

**สำหรับ Demo**: ใช้ ngrok หรือ Railway

---

## 🔒 Security Notes

เมื่อ deploy สาธารณะ ควรเพิ่ม:
- Rate limiting (จำกัดการ upload)
- File size limits (มีอยู่แล้ว: 250MB)
- Authentication (ถ้าต้องการ)
- HTTPS (Railway/Render มีให้อัตโนมัติ)
