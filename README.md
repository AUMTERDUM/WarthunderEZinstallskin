# War Thunder Auto Skin - Easy Install 

**Desktop App** สำหรับติดตั้ง UserSkins และ Sound Mods ของ War Thunder จากไฟล์ .zip แบบง่ายๆ

![War Thunder](https://img.shields.io/badge/War%20Thunder-Skins-red?style=for-the-badge)
![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?style=for-the-badge)
![Download](https://img.shields.io/badge/Download-Portable%20.exe-green?style=for-the-badge)

---

##  ดาวน์โหลด (สำหรับผู้ใช้ทั่วไป)

###  วิธีที่ง่ายที่สุด - ดาวน์โหลด Portable .exe

1. **ไปที่หน้า [Releases](https://github.com/AUMTERDUM/WarthunderEZinstallskin/releases)**
2. **ดาวน์โหลดไฟล์** `War Thunder Auto Skin 1.0.0.exe` (ประมาณ 71 MB)
3. **ดับเบิลคลิกเปิด** - ใช้งานได้เลย! ไม่ต้องติดตั้ง!

>  **หมายเหตุ:** Windows อาจแจ้งเตือน "Windows protected your PC" - คลิก **More info**  **Run anyway**

---

##  Features

-  **Portable App** - ไม่ต้องติดตั้ง ดาวน์โหลดแล้วใช้ได้เลย
-  **ติดตั้งหลายไฟล์** - อัปโหลด .zip หลายไฟล์พร้อมกัน
-  **Drag & Drop** - ลากไฟล์วางได้เลย สะดวกสุดๆ
-  **Folder Picker** - เลือกโฟลเดอร์ปลายทางผ่าน Windows dialog
-  **Smart Installation** - ตรวจสอบโครงสร้างไฟล์ (.blk files) อัตโนมัติ
-  **Sound Mod Support** - ติดตั้ง sound mod และแก้ไข config.blk อัตโนมัติ
-  **Security** - ป้องกัน Zip Bomb และ Path Traversal
-  **War Thunder Theme** - UI สีแดงอิฐตามธีมเกม
-  **Auto Save Path** - จำ path ที่เลือกไว้อัตโนมัติ

---

##  วิธีใช้งาน

1. **เปิดแอป** War Thunder Auto Skin
2. **ตั้งค่าโฟลเดอร์เกม** - คลิก  เลือก เพื่อเลือกโฟลเดอร์ War Thunder
3. **เลือกไฟล์** - คลิกเลือก หรือลาก .zip มาวาง
4. **คลิก Install** - รอสักครู่ เสร็จ!

---

##  สำหรับ Developers

### Build จาก Source

```bash
# 1. Clone repository
git clone https://github.com/AUMTERDUM/WarthunderEZinstallskin.git
cd WarthunderEZinstallskin

# 2. ติดตั้ง dependencies
npm install

# 3. รัน Development mode
npm run dev:electron

# 4. Build Portable .exe
npm run dist:win
# ไฟล์จะอยู่ใน folder release/
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (Hot reload) |
| `npm run dev:electron` | Electron + Vite dev mode |
| `npm run build` | Build production web |
| `npm run electron` | Run Electron (after build) |
| `npm run dist:win` | Build portable .exe |

---

##  โครงสร้างโปรเจ็กต์

```
WarthunderEZinstallskin/
 electron/
    main.js        # Electron main process
    preload.js     # Preload script (IPC)
 src/              
    App.jsx        # Main React component
    App.css        # War Thunder themed styles
    main.jsx       # React entry point
 public/           
    wt-logo.png    # War Thunder logo
 dist/              # Production build (generated)
 release/           # Portable .exe (generated)
 server.js          # Express backend (web mode)
 package.json
 vite.config.mjs
```

---

##  Contributing

Pull requests are welcome! For major changes, please open an issue first.

##  License

MIT License - ใช้ได้ฟรี แก้ไขได้ แจกจ่ายได้

---

Made with  for War Thunder Community
