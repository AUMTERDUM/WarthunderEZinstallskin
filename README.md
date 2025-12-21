# WT Auto Skin (Rust)

โปรแกรม CLI สำหรับติดตั้ง (แตกไฟล์) skin ของเกม War Thunder แบบอัตโนมัติจากไฟล์ `.zip` ไปยังโฟลเดอร์ `UserSkins` ของเกม

ค่าเริ่มต้นปลายทาง (ตามที่คุณให้มา):

- `F:\SteamLibrary\steamapps\common\War Thunder\UserSkins`

> ถ้าโฟลเดอร์เกมอยู่ไดรฟ์/พาธอื่น ใช้ `--dest` เพื่อระบุเอง

## วิธีใช้

## เตรียมเครื่อง (Windows)

ถ้าเจอ error แบบ `link.exe not found` แปลว่ายังไม่มี C++ linker สำหรับ toolchain แบบ MSVC

เลือกได้ 1 ทาง:

1) **ติดตั้ง Visual Studio Build Tools (แนะนำ)**
	- ติดตั้ง “Build Tools for Visual Studio 2019/2022” และเลือก workload **Desktop development with C++**
	- เปิดเทอร์มินัลใหม่ แล้วลอง `cargo build` อีกครั้ง

2) ใช้ toolchain แบบ **GNU**
	- `rustup toolchain install stable-x86_64-pc-windows-gnu`
	- `rustup default stable-x86_64-pc-windows-gnu`
	- ต้องมี MinGW-w64 (เช่น MSYS2) ให้ `gcc`/`ld` ใช้งานได้

ติดตั้งจากไฟล์ zip (รองรับหลายไฟล์):

```bat
cargo run -- "C:\path\to\skin.zip"
```

ระบุปลายทางเอง:

```bat
cargo run -- --dest "D:\SteamLibrary\steamapps\common\War Thunder\UserSkins" "C:\path\to\skin.zip"
```

ถ้าโฟลเดอร์สกินซ้ำ และต้องการทับ ให้ใช้ `--force`:

```bat
cargo run -- --force "C:\path\to\skin.zip"
```

## Notes

- ป้องกัน Zip Slip: จะไม่ยอมแตกไฟล์ที่พยายามออกนอกโฟลเดอร์ปลายทาง
- ถ้า zip มีโฟลเดอร์ระดับบนสุดแค่ 1 โฟลเดอร์ จะติดตั้งโดยใช้ชื่อนั้น
- ถ้า zip มีไฟล์/หลายโฟลเดอร์ที่ราก จะสร้างโฟลเดอร์ปลายทางตามชื่อไฟล์ zip
