const { ipcRenderer } = require("electron");

// DOM Elementleri
const form = document.getElementById("cardForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const titleInput = document.getElementById("title");
const idNumberInput = document.getElementById("idNumber");
const photoFileInput = document.getElementById("photoFile");
const generateBtn = document.getElementById("generateBtn");
const statusMessage = document.getElementById("statusMessage");

const previewName = document.getElementById("previewName");
const previewTitle = document.getElementById("previewTitle");
const previewId = document.getElementById("previewId");
const previewImage = document.getElementById("previewImage");

let currentPhotoDataUrl = null;

// Canlı Önizleme Event Listener'ları
firstNameInput.addEventListener("input", updatePreviewText);
lastNameInput.addEventListener("input", updatePreviewText);
titleInput.addEventListener("input", updatePreviewText);
idNumberInput.addEventListener("input", updatePreviewText);

function updatePreviewText() {
  const first = firstNameInput.value.trim();
  const last = lastNameInput.value.trim();
  previewName.textContent = first || last ? `${first} ${last}` : "PERSONEL ADI SOYADI";

  previewTitle.textContent = titleInput.value.trim() || "Ünvanı";
  previewId.textContent = idNumberInput.value.trim() ? idNumberInput.value.trim() : "0000";
}

photoFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Target ID card photo dimensions are scaled up for high DPI print quality
        const width = 1200;
        const height = 1600;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // Transparan arkaplan temizliği
        ctx.clearRect(0, 0, width, height);

        // Oranları çözünürlüğe göre büyütüyoruz
        const borderRadius = 80;
        const borderWidth = 32; // Mavi border kalınlığı

        // Hafif yumuşatılmış kare (roundRect) maske
        ctx.beginPath();
        ctx.roundRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth, borderRadius);
        ctx.save();
        ctx.clip();

        // Resmi boşluksuz kaplayacak şekilde orantılı çiz (cover)
        const aspect = img.width / img.height;
        const targetAspect = width / height;

        let drawWidth, drawHeight, offsetX, offsetY;
        if (aspect > targetAspect) {
          drawHeight = height;
          drawWidth = height * aspect;
          offsetY = 0;
          offsetX = -(drawWidth - width) / 2;
        } else {
          drawWidth = width;
          drawHeight = width / aspect;
          offsetX = 0;
          offsetY = -(drawHeight - height) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();

        // Mavi Çerçeve Çiz
        ctx.strokeStyle = "#2d4b9a";
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        // PNG olarak belleğe al
        currentPhotoDataUrl = canvas.toDataURL("image/png");

        previewImage.src = currentPhotoDataUrl;
        previewImage.style.display = "block";
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    previewImage.style.display = "none";
    currentPhotoDataUrl = null;
  }
});

// Form Gönderme
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentPhotoDataUrl) {
    setStatus("Lütfen personel fotoğrafı seçin.", "error");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "PDF Oluşturuluyor...";
  statusMessage.classList.add("hidden");

  try {
    // Main process'e bilgileri gönderip PDF'i oluştur
    const result = await ipcRenderer.invoke("generate-pdf", {
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      title: titleInput.value.trim(),
      idNumber: idNumberInput.value.trim(),
      photoDataUrl: currentPhotoDataUrl,
    });

    if (result.success) {
      setStatus(`PDF başarıyla kaydedildi`, "success");
    } else {
      setStatus(`Hata: ${result.message}`, "error");
    }
  } catch (error) {
    setStatus(`Beklenmeyen bir hata oluştu: ${error.message}`, "error");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "PDF Oluştur ve Kaydet";
  }
});

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`; // Removes hidden
  statusMessage.style.display = "block";
}
