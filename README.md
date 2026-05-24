# Ramein Backend

Backend aplikasi event/konser dengan:
- Express.js (REST API)
- MySQL (query SQL mentah, tanpa ORM)
- JWT Auth (role `admin` dan `user`)
- Master data + event management
- Transaksi tiket
- Integrasi Midtrans (Snap + webhook)
- Unit/integration testing (Jest + Supertest)

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

4. Jalankan server
```bash
npm run dev
```

## Testing

Untuk test, siapkan database terpisah (misalnya `ramein_test`) lalu set env:
```bash
MYSQL_DATABASE=ramein_test
NODE_ENV=test
npm test
```

`tests/setup.js` akan membuat tabel dari `src/db/schema.sql` dan membersihkan data tiap test.

## Base URL

`/api/v1`

## Endpoint Inti

- Auth: `/auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/logout`
- User: `/users/me`, `/users/admin/list`
- Master data: `/master/categories`, `/master/cities`, `/master/organizers`
- Event: `/events`, `/events/:id`, `/events/:id/publish`
- Transaction: `/transactions`, `/transactions/me`, `/transactions/admin/all`
- Payment webhook: `/payments/midtrans/notification`

## Catatan Midtrans

- Jika `MIDTRANS_SERVER_KEY` belum diisi, sistem menggunakan dummy token pembayaran untuk mode development.
- Saat production/sandbox Midtrans aktif, signature callback diverifikasi dengan server key.
- Pastikan key dan mode cocok:
  - Sandbox: `MIDTRANS_SERVER_KEY=SB-Mid-server-...` dan `MIDTRANS_IS_PRODUCTION=false`
  - Production: `MIDTRANS_SERVER_KEY=Mid-server-...` dan `MIDTRANS_IS_PRODUCTION=true`
