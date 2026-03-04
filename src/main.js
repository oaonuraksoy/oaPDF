const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "..", "assets", "img", "app_icon.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  // mainWindow.webContents.openDevTools();

  // Yalnızca "Yenile" seçeneğini barındıran özel menü
  const template = [
    {
      label: "Yenile",
      accelerator: "CmdOrCtrl+R",
      click: (item, focusedWindow) => {
        if (focusedWindow) focusedWindow.reload();
      },
    },
  ];

  const customMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(customMenu);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// Dinamik PDF Oluşturma Adımı
ipcMain.handle("generate-pdf", async (event, data) => {
  try {
    const { firstName, lastName, title, idNumber, photoDataUrl } = data;

    // Yeni bir PDF dokümanı oluştur
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Font yükleme (Türkçe karakter desteği için projeye gömülü Arial)
    const fontPathRegular = path.join(__dirname, "..", "assets", "fonts", "arial.ttf");
    const fontPathBold = path.join(__dirname, "..", "assets", "fonts", "arialbd.ttf");
    let customFont, customFontBold;
    if (fs.existsSync(fontPathRegular) && fs.existsSync(fontPathBold)) {
      customFont = await pdfDoc.embedFont(fs.readFileSync(fontPathRegular));
      customFontBold = await pdfDoc.embedFont(fs.readFileSync(fontPathBold));
    } else {
      throw new Error("Proje dizininde Arial fontları (arial.ttf, arialbd.ttf) bulunamadı.");
    }

    // PDF Boyutları: 80x50 mm (1mm = 2.83465 pt)
    const cardWidth = 80 * 2.83465; // ~226.77 pt
    const cardHeight = 50 * 2.83465; // ~141.73 pt

    // 1. Sayfa (Ön Yüz)
    const firstPage = pdfDoc.addPage([cardWidth, cardHeight]);
    const { width, height } = firstPage.getSize();

    // Ön Yüz Arkaplanını (on.jpg) Göm
    const frontBgPath = path.join(__dirname, "..", "assets", "img", "on.jpg");
    if (fs.existsSync(frontBgPath)) {
      const frontBgBytes = fs.readFileSync(frontBgPath);
      const frontBgImage = await pdfDoc.embedJpg(frontBgBytes);
      firstPage.drawImage(frontBgImage, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
    }

    // Gelen base64 resmi göm
    const base64Image = photoDataUrl.split(",")[1];
    const imageBytes = Buffer.from(base64Image, "base64");
    const embeddedImage = await pdfDoc.embedPng(imageBytes);

    // [Koordinatlar tahmini olarak eklenmiştir, boyutlar 80x50mm baz alınarak]
    const renderWidth = width * 0.22;
    const renderHeight = height * 0.49;
    const imgX = width * 0.72; // Left: 72% de CSS ile
    const imgY = height * 0.16; // 0.20 idi, aşağı alındı (Y koordinatı alttan başladığı için küçüldü)

    firstPage.drawImage(embeddedImage, {
      x: imgX,
      y: imgY,
      width: renderWidth,
      height: renderHeight,
    });

    // Metin boyutları
    const fontSizeName = 14;
    const fontSizeTitle = 11;
    const fontSizeId = 11;

    // Metin: İsim Soyisim (Sola Dayalı)
    const nameText = `${firstName} ${lastName}`.toLocaleUpperCase("tr-TR");
    firstPage.drawText(nameText, {
      x: width * 0.05,
      y: height * 0.44, // 0.48 idi, aşağı indirildi
      size: fontSizeName,
      font: customFontBold,
      color: rgb(0, 0, 0),
    });

    // Metin: Ünvan (Sola Dayalı)
    firstPage.drawText(title, {
      x: width * 0.05,
      y: height * 0.36, // 0.40 idi, isme göre oranlanıp indirildi
      size: fontSizeTitle,
      font: customFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Metin: Sicil No (Görsele ortalı, altta, beyaz fontla)
    const idText = idNumber;
    const idWidth = customFontBold.widthOfTextAtSize(idText, fontSizeId);
    firstPage.drawText(idText, {
      x: imgX + renderWidth / 2 - idWidth / 2,
      y: height * 0.02, // Öncesi 0.025 idi, tamamen şeridin en altına sıfırlandı
      size: fontSizeId,
      font: customFontBold,
      color: rgb(1, 1, 1),
    });

    // 2. Sayfa (Arka Yüz)
    const secondPage = pdfDoc.addPage([cardWidth, cardHeight]);

    // Arka Yüz Arkaplanını (arka.jpg) Göm
    const backBgPath = path.join(__dirname, "..", "assets", "img", "arka.jpg");
    if (fs.existsSync(backBgPath)) {
      const backBgBytes = fs.readFileSync(backBgPath);
      const backBgImage = await pdfDoc.embedJpg(backBgBytes);
      secondPage.drawImage(backBgImage, {
        x: 0,
        y: 0,
        width: cardWidth,
        height: cardHeight,
      });
    }

    // PDF'i kaydetmek için kullanıcıya sor
    const pdfBytes = await pdfDoc.save();

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "PDF Kaydet",
      defaultPath: `${firstName}_${lastName}_YakaKarti.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (canceled) {
      return { success: false, message: "İşlem iptal edildi." };
    }

    fs.writeFileSync(filePath, pdfBytes);
    return { success: true, filePath };
  } catch (error) {
    console.error("PDF oluşturma hatası:", error);
    return { success: false, message: error.message };
  }
});
