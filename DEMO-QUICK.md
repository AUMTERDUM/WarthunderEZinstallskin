# วิธี Demo แบบชั่วคราว

## ใช้ ngrok (แนะนำ)

1. ติดตั้ง ngrok: https://ngrok.com/download
2. รัน server:
```bash
npm start
```

3. เปิด terminal ใหม่ รัน:
```bash
ngrok http 3000
```

4. จะได้ URL เช่น: https://xxxx-xx-xx-xx-xx.ngrok-free.app
5. แชร์ URL นี้ให้คนอื่นใช้ได้เลย!

## ใช้ Cloudflare Tunnel (ฟรี ไม่มีจำกัดเวลา)

1. ติดตั้ง: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
2. รัน:
```bash
npm start
cloudflared tunnel --url http://localhost:3000
```

3. จะได้ URL ให้แชร์

---

**ข้อจำกัด**: 
- ต้องเปิด server ทิ้งไว้ตลอดเวลา
- ปิดเครื่องแล้ว demo จะใช้ไม่ได้
