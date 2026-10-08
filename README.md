# Bandwidth I/O Status Discord

สคริปต์ Node.js สำหรับ Linux ที่อ่านความเร็วเน็ตขาเข้า (IN) และขาออก (OUT) จากระบบ แล้วเอาไปแสดงใน Custom Status ของบัญชี Discord ของเรา อัปเดตเป็นระยะตามเวลาที่ตั้งไว้ในไฟล์ config

## ฟีเจอร์

- อ่านสถิติเน็ตจากไฟล์ /proc/net/dev บน Linux
- คำนวณอัตรา IN และ OUT แล้วแสดงเป็นข้อความสั้นๆ เช่น IN : 1.2 MB/s OUT : 450 KB/s
- ข้าม interface ที่ไม่ต้องการนับ เช่น lo, docker, veth, bridge ตามค่า excludePatterns
- เลือกนับเฉพาะการ์ดเน็ตที่ระบุได้ (interface เป็น null, ชื่อเดียว หรือหลายชื่อ)
- ลดการยิง API ถ้าข้อความสถานะไม่เปลี่ยน
- รองรับ rate limit ของ Discord โดยรอตาม retry-after
- กดหยุดโปรแกรมแล้วล้าง Custom Status ได้ถ้าเปิด clearOnExit

## เทคโนโลยีที่ใช้

- ภาษา: JavaScript (ES modules)
- รัน time: Node.js 18 ขึ้นไป
- ไลบรารีภายนอก: ไม่มี ใช้ fetch และโมดูล built-in ของ Node เท่านั้น
- ระบบปฏิบัติการ: Linux เท่านั้น (เช่น Ubuntu) เพราะต้องอ่าน /proc/net/dev

## สิ่งที่ต้องมีก่อนติดตั้ง

- Linux (สคริปต์จะหยุดทันทีถ้ารันบน Windows หรือ macOS)
- Node.js เวอร์ชัน 18 ขึ้นไป ตรวจด้วยคำสั่ง node -v
- บัญชี Discord และ token ที่ใช้เรียก Discord API ได้ (ใส่ใน config.json ห้ามอัปโหลด token ขึ้น GitHub)

## วิธีติดตั้ง

1. เอาโปรเจกต์มาไว้ในเครื่อง Linux แล้วเข้าโฟลเดอร์โปรเจกต์

```bash
cd Bandwidth-I-O-Status-Discord-main
```

2. ตรวจว่า Node พร้อมใช้

```bash
node -v
```

3. เปิดไฟล์ config.json แล้วใส่ token ในช่อง token (เป็นสตริง ไม่เว้นว่าง)

4. ปรับค่าอื่นใน config.json ตามต้องการ (ดูตารางในหัวข้อวิธีใช้งาน)

5. รันโปรแกรม

```bash
npm start
```

หรือ

```bash
node index.js
```

## วิธีใช้งาน

### ตั้งค่า config.json

ไฟล์ config.json อยู่ที่โฟลเดอร์รากของโปรเจกต์ แต่ละช่องทำงานแบบนี้

- token: ใส่ Discord token ของบัญชีที่ต้องการให้แสดง Custom Status ต้องไม่ว่าง
- updateIntervalMs: ช่วงเวลาระหว่างการวัดและอัปเดต หน่วยมิลลิวินาที ค่าเริ่มต้น 15000 (15 วินาที) ต้องไม่ต่ำกว่า 1000 และถ้าต่ำกว่า 5000 โปรแกรมจะเตือนว่าอาจโดน rate limit
- interface: null แปลว่ารวมทุก interface ที่ไม่ถูก exclude ถ้าใส่เป็นสตริงเดียว เช่น "eth0" จะนับแค่การ์ดนั้น ถ้าใส่เป็น array เช่น ["eth0", "wlan0"] จะรวมหลายการ์ด
- excludePatterns: รายการ regex สำหรับชื่อ interface ที่ไม่เอามานับ ใช้เมื่อ interface เป็น null
- clearOnExit: true แล้วกด Ctrl+C หรือส่ง SIGTERM โปรแกรมจะล้าง Custom Status ก่อนปิด false แล้วสถานะจะค้างไว้บน Discord

ตัวอย่าง config ที่นับแค่ eth0 อัปเดตทุก 20 วินาที และล้างสถานะตอนปิด

```json
{
  "token": "ใส่_token_ของคุณที่นี่",
  "updateIntervalMs": 20000,
  "interface": "eth0",
  "excludePatterns": ["^docker", "^veth", "^br-", "^lo"],
  "clearOnExit": true
}
```

### ดูชื่อ interface ในเครื่อง

ถ้าไม่แน่ใจว่าการ์ดเน็ตชื่ออะไร ลองคำสั่งใดคำสั่งหนึ่ง

```bash
ip -br link show
```

หรือ

```bash
cat /proc/net/dev
```

เอาชื่อคอลัมน์แรกของแต่ละบรรทัด (ก่อนเครื่องหมาย :) ไปใส่ใน interface

### รันและดูผล

1. รัน npm start ในโฟลเดอร์โปรเจกต์
2. ถ้า token ถูกต้อง จะเห็นข้อความประมาณ Logged in as ชื่อผู้ใช้. Updating custom status every ... ms.
3. รอบแรกอาจยังไม่มีตัวเลขความเร็ว เพราะต้องมีจุดวัดสองครั้งถึงจะคำนวณ rate ได้ รอบถัดไปจะเห็นข้อความแบบ IN : ... OUT : ... ในเทอร์มินัลเมื่อมีการอัปเดต
4. เปิด Discord บนมือถือหรือเดสก์ท็อป ดู Custom Status ของบัญชีนั้น ควรตรงกับข้อความที่โปรแกรมพิมพ์

### หยุดโปรแกรม

กด Ctrl+C ในเทอร์มินัลที่รันอยู่

- ถ้า clearOnExit เป็น true จะเห็น Custom status cleared. แล้วสถานะบน Discord หาย
- ถ้าเป็น false สถานะสุดท้ายจะยังอยู่จนกว่าจะเปลี่ยนเองหรือรันสคริปต์อื่น

### ข้อความ error ที่พบบ่อย

- This script must run on Linux: ต้องย้ายไปรันบน Linux ไม่ใช่ Windows
- Token rejected (401): token ผิดหรือหมดอายุ แก้ใน config.json
- Network interface not found: ชื่อใน interface ไม่ตรงกับเครื่อง ลอง ip -br link show แล้วแก้ชื่อ
- Rate limited: Discord ให้รอ โปรแกรมจะ backoff เอง ลองเพิ่ม updateIntervalMs ให้ยาวขึ้น

### รันค้างไว้หลังปิดเทอร์มินัล (ทางเลือก)

ถ้าต้องการให้รันตลอดบนเซิร์ฟเวอร์ Linux สามารถใช้ systemd, screen, tmux หรือ pm2 ตามที่คุ้นเคย โปรเจกต์นี้ไม่ได้แพ็ก service มาให้ ต้องตั้งเอง

## โครงสร้างโฟลเดอร์

```
Bandwidth-I-O-Status-Discord-main
  index.js           จุดเริ่มรัน วน loop อ่านเน็ตและอัปเดต Discord
  config.json        ตั้งค่า token และช่วงเวลาอัปเดต
  package.json       ชื่อโปรเจกต์และคำสั่ง npm start
  src
    config.js        โหลดและตรวจค่า config.json
    discord.js       เรียก Discord API (users/@me และ custom status)
    format.js        จัดรูปแบบความเร็วเป็น B/s KB/s MB/s
    net-linux.js     อ่านและรวม byte จาก /proc/net/dev
  README.md          ไฟล์นี้
```


## ไลเซนส์

MIT License ตามที่ระบุใน package.json
