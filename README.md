# Dashboard SPK Supplier (Metode SAW)

Website statis untuk Modul 4 Praktikum Terintegrasi II, Perancangan Sistem Pendukung Keputusan.
Unggah data supplier (CSV atau Excel), lalu nilai preferensi, peringkat, dan grafik muncul otomatis.
Semua perhitungan berjalan di browser, tidak ada server dan tidak ada data yang dikirim ke mana pun.

## Isi folder

| Berkas | Fungsi |
| --- | --- |
| `index.html` | Struktur halaman |
| `style.css` | Tampilan (mendukung mode terang dan gelap, nyaman di ponsel) |
| `script.js` | Pembacaan berkas, perhitungan SAW, dan penggambaran grafik |
| `contoh_data_modul4.csv` / `.xlsx` | Contoh berkas data (data Modul 4) untuk dicoba diunggah |
| `.nojekyll` | Memberi tahu GitHub Pages agar menyajikan berkas apa adanya |

## Memasang di GitHub Pages

1. Buat repositori baru di GitHub, misalnya `dashboard-spk`, dengan visibilitas Public.
2. Klik **Add file > Upload files**, seret seluruh isi folder ini (`index.html`, `style.css`, `script.js`, dan lainnya) ke halaman tersebut, lalu **Commit changes**. Pastikan `index.html` berada di akar repositori, bukan di dalam subfolder.
3. Buka **Settings > Pages**. Pada **Build and deployment**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu 1 sampai 2 menit. Alamat situs muncul di halaman yang sama, berbentuk `https://NAMA-AKUN.github.io/dashboard-spk/`.

Setiap kali Anda mengubah berkas di repositori, situs ikut diperbarui otomatis.

## Format berkas data

Satu tabel. Baris pertama berisi judul kolom. Baris berlabel **Jenis** dan **Bobot** menjelaskan tiap kriteria. Baris sesudahnya adalah supplier.

| Alternatif | Harga per set | Kualitas bahan | Pengiriman |
| --- | --- | --- | --- |
| Jenis | Cost | Benefit | Benefit |
| Bobot | 40 | 35 | 25 |
| Supplier A | 129000 | 0,75 | 0,75 |
| Supplier B | 135000 | 1,00 | 0,75 |

- `Cost`: makin kecil makin baik. `Benefit`: makin besar makin baik.
- Bobot boleh persen (total 100) atau pecahan (total 1). Total lain dinormalkan otomatis dengan peringatan.
- Angka boleh memakai koma atau titik desimal. Harga boleh `129000` atau `129.000`.
- Minimal 2 supplier dan 2 kriteria. Untuk Excel, lembar pertama yang dibaca.
- CSV boleh dipisah koma, titik koma (umum pada Excel berbahasa Indonesia), atau tab.
- Tombol **Unduh template Excel** dan **Unduh template CSV** menghasilkan berkas contoh yang siap diisi.

Pilihan **Supplier saat ini** di bagian atas dipakai untuk menyorot supplier yang sedang dipakai pada grafik peringkat. Untuk berkas yang Anda unggah, pilihan ini awalnya kosong.

## Catatan

- Pembaca Excel (SheetJS) dimuat dari internet (cdnjs). Tanpa internet, berkas CSV tetap bisa dipakai.
  Agar Excel juga jalan tanpa internet, unduh `xlsx.full.min.js` versi 0.18.5, simpan di folder ini, lalu ubah alamat pada tag `<script>` di `index.html` menjadi `xlsx.full.min.js`.
- Data pada tombol **Pakai data contoh Modul 4** bersifat hipotetik, kecuali harga A1 (Rp129.000) dari Modul 1. Ganti dengan data survei sebelum dipakai untuk keputusan pembelian.
- Kriteria ke-8 dan seterusnya digabung menjadi satu warna abu pada grafik komposisi agar warna tidak berulang. Tabel dan perhitungan tetap memakai semua kriteria.
- Mengubah bobot, rating, atau menambah supplier tidak memerlukan perubahan kode. Cukup ubah berkas data lalu unggah.
