# KarbonBeyan Deployment Ready Skeleton

Bu proje, Turkiye'deki KOBI ihracatcilari icin CBAM definitive regime veri toplama, default-value fallback, emisyon hesaplama ve taslak beyan olusturma akisina yonelik temel bir iskelet sunar.

## Veri Modeli

Ana veri bloklari:

- deklarant: EORI, CBAM account number, yerlesik oldugu uye devlet
- ithalat detaylari: mense, ithal tarihi, customs procedure, miktar
- goods: 8 haneli CN kodu, urun tipi, sektor, net kutle
- tesis: installation id, operator ve iletisim bilgileri
- raporlama ve metodoloji: declaration year, production route, actual/default/mixed secimi
- emisyon girdileri: enerji, prekursor, proses emisyonu, karbon fiyati, verification bilgisi
- PDF varliklari: logo yolu, imza sahibi, kase kutusu

Ornek payload: [examples/shipment_example.json](/Users/goker/Documents/Codex/2026-04-19-persona-sen-k-demli-bir-full/examples/shipment_example.json)

## Default Values

2026 icin sinirli ama calisir bir katsayi seti [app/data/cbam_default_values_2026.json](/Users/goker/Documents/Codex/2026-04-19-persona-sen-k-demli-bir-full/app/data/cbam_default_values_2026.json) altina eklendi.

- kaynak dayagi: Regulation (EU) 2023/956, Implementing Regulations 2025/2547 ve 2025/2621
- kapsam: MVP icin demir-celik ve aluminyum alt kumesi
- not: tum ek resmi annex tabloyu otomatik cekemedigimiz icin bazi satirlar manual curated olarak isaretlendi

## Oncelik Motoru

Hesaplama servisi [app/services/emissions.py](/Users/goker/Documents/Codex/2026-04-19-persona-sen-k-demli-bir-full/app/services/emissions.py) icinde su sirayla calisir:

1. Kullanici `actual` veya `mixed` secmis mi?
2. Gercek emisyon verisi var mi?
3. Varsa actual hesap yap.
4. Yoksa [app/services/default_values.py](/Users/goker/Documents/Codex/2026-04-19-persona-sen-k-demli-bir-full/app/services/default_values.py) icinden uygun CN code + mense default degerini bul.
5. Demir-celik ve aluminyum icin `Annex II` kuralini uygula ve indirect emissions'i sifirla.

## PDF Katmani

[app/services/pdf_generator.py](/Users/goker/Documents/Codex/2026-04-19-persona-sen-k-demli-bir-full/app/services/pdf_generator.py) artik:

- yeni veri modelini okur
- baslikta logo kutusu veya gercek logo gosterir
- deklarant, ithalat, tesis ve metodoloji bloklari cizer
- emisyon ozet tablosu olusturur
- kase / imza alani ekler

Bu cikti resmi CBAM registry formunun birebir kopyasi degil; fakat communication-template mantigina daha yakin, kurumsal bir taslak form uretiyor.

## Ihracatci Workflow

Basit kullanim akisi:

1. Ihracatci urun CN kodunu, miktari, menseyi ve tesis bilgisini girer.
2. Eger tesis actual emissions ve verifier raporu sagliyorsa bunlari ekler.
3. Saglamiyorsa sistem ayni urun ve mense icin 2026 default value kaydini otomatik bulur.
4. API hesaplama sonucunu ve PDF deklarasyon taslagini uretir.
5. Yetkili kisi logo, imza ve kase alaniyla PDF'i gozden gecirir.
6. Sonraki fazda bu veri CBAM Registry entegrasyonuna aktarilabilir.

## Calistirma

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Local Kurulum

Projeyi local ortamda kaldirmak icin:

1. Backend ortamını hazirla:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Backend API'yi baslat:

```bash
uvicorn app.main:app --reload
```

Backend varsayilan olarak `http://localhost:8000` adresinde calisir.

3. Yeni bir terminal ac ve frontend klasorune gir:

```bash
cd frontend
npm install
```

4. Frontend ortam degiskenini hazirla:

```bash
cp .env.example .env
```

Varsayilan olarak frontend `VITE_API_BASE_URL=http://localhost:8000` kullanir.

5. Frontend'i baslat:

```bash
npm run dev
```

Frontend varsayilan olarak `http://localhost:5173` adresinde acilir.

6. Kullanim akisi:

- Dashboard'a gir ve `Yeni Rapor Oluştur` butonuna tikla
- Cok adimli formu tamamla
- Son adimda `Taslak Raporu Oluştur` butonuna bas
- Sistem FastAPI uzerinden `POST /api/v1/shipments` cagirir
- Kayit olustugunda `PDF İndir` butonu aktif olur
- Butona basildiginda frontend `GET /api/v1/shipments/{shipment_id}/pdf` ile dosyayi indirir

## Deployment

Bu proje `www.karbonbeyan.com` frontend ve `api.karbonbeyan.com` backend yapisi icin hazirlandi.

### Frontend / Vercel

Frontend konfigurasyonu: [frontend/vercel.json](/Users/goker/KarbonBeyan/2026-04-19-persona-sen-k-demli-bir-full/frontend/vercel.json)

Production env ornegi: [frontend/.env.production.example](/Users/goker/KarbonBeyan/2026-04-19-persona-sen-k-demli-bir-full/frontend/.env.production.example)

Vercel ortam degiskenleri:

- `VITE_API_BASE_URL=https://api.karbonbeyan.com`
- `VITE_APP_NAME=KarbonBeyan`
- `VITE_APP_DOMAIN=https://www.karbonbeyan.com`

Vercel ayarlari:

1. Root Directory olarak `frontend` sec
2. Build Command `npm run build`
3. Output Directory `dist`
4. Production domain olarak `www.karbonbeyan.com` bagla
5. Apex domain `karbonbeyan.com` icin `www`'ye redirect tanimla

### Backend / Railway

Backend konfigurasyonlari:

- [Procfile](/Users/goker/KarbonBeyan/2026-04-19-persona-sen-k-demli-bir-full/Procfile)
- [railway.json](/Users/goker/KarbonBeyan/2026-04-19-persona-sen-k-demli-bir-full/railway.json)
- [.env.production.example](/Users/goker/KarbonBeyan/2026-04-19-persona-sen-k-demli-bir-full/.env.production.example)

Railway ortam degiskenleri:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `APP_ENV=production`
- `APP_NAME=KarbonBeyan API`
- `PORT=8000`
- `ALLOWED_ORIGINS=https://karbonbeyan.com,https://www.karbonbeyan.com`

Notlar:

- `DATABASE_URL` verilmezse sistem local SQLite kullanir
- Railway Postgres eklersen shipment ve default value verileri kalici olur
- Railway health check yolu `/health` olarak ayarlanmistir
- API custom domain olarak `api.karbonbeyan.com` kullan

### Domain Baglama

Onerilen DNS yapisi:

- `www.karbonbeyan.com` -> Vercel frontend
- `karbonbeyan.com` -> `www.karbonbeyan.com` redirect
- `api.karbonbeyan.com` -> Railway backend

Bu yapiyla:

- kullanici arayuzu ana web deneyiminde `www` altinda kalir
- backend ayri subdomain uzerinden guvenli sekilde yonetilir
- CORS sadece gercek production domainlerine izin verir
