# oaPDF - Yaka Kartı Otomasyonu

oaPDF, yaka kartlarının otomatik olarak şablonlara yerleştirilip PDF formatında çıktı alınmasını sağlayan Electron tabanlı bir masaüstü uygulamasıdır.

## Özellikler

- `pdf-lib` kullanılarak mevcut PDF şablonları üzerine dinamik veri (İsim, Unvan, Sicil No, Fotoğraf vb.) ekleme
- Özel font (fontkit) desteği ile şık tasarımlar
- Windows için tek tıkla kurulum (NSIS kullanarak)

## Geliştirme

Projeyi kendi ortamınızda çalıştırmak için [Node.js](https://nodejs.org/) kurulu olması gerekmektedir.

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
2. Uygulamayı başlatın (Geliştirici modu):
   ```bash
   npm start
   ```

## Derleme (Publish / Build)

Projeyi Windows için derleyip yüklenebilir (EXE) dosyası oluşturmak için aşağıdaki komutu kullanabilirsiniz:

```bash
npm run build
```

Derleme işlemi bittikten sonra setup dosyası `dist/` klasörü içinde oluşacaktır.

## Kullanılan Teknolojiler

- **[Electron](https://www.electronjs.org/):** Masaüstü uygulama çatısı
- **[pdf-lib](https://pdf-lib.js.org/):** PDF dokümanları oluşturma ve düzenleme kütüphanesi
- **HTML, CSS, JavaScript:** Kullanıcı arayüzü
