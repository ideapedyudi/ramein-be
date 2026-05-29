# Ramein Backend

Backend aplikasi event/konser dengan:
- Express.js (REST API)
- MySQL (query SQL mentah, tanpa ORM)
- JWT Auth (role `admin` dan `user`)
- Master data + event management
- Transaksi tiket
- Integrasi Midtrans (Snap + webhook)

Semua ID utama (`id`) memakai UUID v4 (contoh: `550e8400-e29b-41d4-a716-446655440000`), bukan auto increment.

## Menjalankan Project

1. Install dependency
```bash
npm install
```

2. Salin environment
```bash
cp .env.example .env
```

3. Inisialisasi database + schema:
```bash
npm run db:init
```
Perintah ini akan me-reset tabel aplikasi lalu membuat ulang schema terbaru.
Script ini sekarang hanya boleh dijalankan untuk database dengan nama berakhiran `_dev` atau `_test`.

4. Jalankan server
```bash
npm run dev
```

## Base URL

`/api/v1`

## Endpoint Inti

- Auth: `/auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/logout`
- User: `/users/me`, `/users/admin/list`
- Master data: `/master/categories`, `/master/cities`, `/master/organizers`
- Event: `/events`, `/events/trending`, `/events/recommended`, `/events/:id`

Semua endpoint `/events` memerlukan token login.
`/events/trending` menampilkan 8 event terbaru yang baru dibuat.
`/events/recommended` default ke kategori `Konser` jika tidak ada parameter minat/category yang dikirim.
- Transaction: `/transactions`, `/transactions/me`, `/transactions/admin/all`, `/transactions/statistic/event/:event_id`
- Withdraw: `/withdraw`, `/withdraw/me`, `/withdraw/all`
- Payment webhook: `/payments/midtrans/notification`

## Catatan Midtrans

- Jika `MIDTRANS_SERVER_KEY` belum diisi, sistem menggunakan dummy token pembayaran untuk mode development.
- Saat production/sandbox Midtrans aktif, signature callback diverifikasi dengan server key.
- Pastikan key dan mode cocok:
  - Sandbox: `MIDTRANS_SERVER_KEY=SB-Mid-server-...` dan `MIDTRANS_IS_PRODUCTION=false`
  - Production: `MIDTRANS_SERVER_KEY=Mid-server-...` dan `MIDTRANS_IS_PRODUCTION=true`
