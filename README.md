# War Thunder Auto Skin - Easy Install 🎮

Local web app สำหรับติดตั้ง UserSkins ของ War Thunder จากไฟล์ .zip แบบง่ายๆ ผ่านเว็บเบราว์เซอร์

![War Thunder](https://img.shields.io/badge/War%20Thunder-Skins-red?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge)

## ✨ Features

- ✅ **ติดตั้งหลายไฟล์** - อัปโหลด .zip หลายไฟล์พร้อมกัน
- ✅ **Drag & Drop** - ลากไฟล์วางได้เลย สะดวกสุดๆ
- ✅ **Folder Picker** - เลือกโฟลเดอร์ปลายทางผ่าน Windows dialog
- ✅ **Smart Installation** - ตรวจสอบโครงสร้างไฟล์ (.blk files) อัตโนมัติ
- ✅ **Security** - ป้องกัน Zip Bomb และ Path Traversal
- ✅ **PWA Support** - ติดตั้งเป็นแอปบนเครื่องได้
- ✅ **War Thunder Theme** - UI สีแดงอิฐตามธีมเกม
- ✅ **Auto Save Path** - จำ path ที่เลือกไว้อัตโนมัติ

## 🚀 Quick Start

### ติดตั้งและรัน

```bash
# 1. Clone repository
git clone https://github.com/AUMTERDUM/WarthunderEZinstallskin.git
cd WarthunderEZinstallskin

# 2. ติดตั้ง dependencies
npm install

# 3. รัน server
npm start
```

เปิดเว็บที่ **http://localhost:3000** 🎉

### สำหรับ Developers

```bash
npm run dev    # Vite dev server (Hot reload)
npm run build  # Build production
npm run preview # Preview production build
```

## 📖 วิธีใช้งาน

1. **เปิดเว็บ** http://localhost:3000
2. **เลือกไฟล์** - คลิกเลือก หรือลาก .zip มาวาง
3. **เลือกโฟลเดอร์** - คลิก 📂 เพื่อเลือก UserSkins folder (ถ้าไม่ใช่ default)
4. **คลิก Install** - รอสักครู่ เสร็จ!

```
F:\SteamLibrary\steamapps\common\War Thunder\UserSkins
```


**Railway.app** (แนะนำ):
1. ไป https://railway.app
2. Login ด้วย GitHub
3. New Project → Deploy from GitHub
4. เลือก repo นี้
5. ✅ Deploy อัตโนมัติ!

ดูรายละเอียดเพิ่มใน [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📦 โครงสร้างโปรเจ็กต์

```
WarthunderEZinstallskin/
├── server.js          # Express backend (API endpoints)
├── src/              
│   ├── App.jsx       # Main React component
│   ├── App.css       # War Thunder themed styles
│   ├── index.css     # Global styles & theme colors
│   └── main.jsx      # React entry point
├── public/           
│   ├── wt-logo.png   # War Thunder logo
│   ├── manifest.json # PWA manifest
│   └── sw.js         # Service Worker
├── dist/             # Production build (generated)
├── index.html        # HTML entry point
├── vite.config.js    # Vite configuration
└── package.json      # Dependencies & scripts
```


## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.3 | Frontend UI framework |
| **Vite** | 7.2.4 | Build tool & dev server |
| **Node.js** | 18+ | Backend runtime |
| **Express** | 4.21.2 | Web server & API |
| **Multer** | 2.0.0 | File upload handling |
| **yauzl** | 2.10.0 | Zip file extraction |
| **PWA** | - | Service Worker + Manifest |

## 🎨 Theme Colors

```css
--bg: #1a0f0f;           /* Dark red background */
--panel: rgba(107, 31, 31, 0.25);  /* Red panel */
--accent: #d4a574;        /* Bronze/gold accent */
--border: rgba(139, 69, 69, 0.35); /* Red border */
```

- ใช้ได้เฉพาะ Windows
- ต้องรัน local (localhost)
- ไม่ support บน deployed server

## 📝 Notes

- ⚠️ **Local Use Only**: Folder picker ใช้ได้เฉพาะบน local machine
- 📦 **Zip Structure**: รองรับทั้ง flat structure และ nested folders
- 🔄 **Force Overwrite**: เลือก checkbox "Force overwrite" เพื่อทับไฟล์เดิม
- 💾 **Auto Save**: Path ที่เลือกจะถูกบันทึกใน localStorage

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 🎮 War Thunder

This is a **fan-made tool** for War Thunder game.  
**Not affiliated with Gaijin Entertainment.**
---

Made with ❤️ for War Thunder Thailand players
