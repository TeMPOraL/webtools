document.addEventListener('DOMContentLoaded', function() {
    const contentInput = document.getElementById('content');
    const errorCorrectionSelect = document.getElementById('errorCorrection');
    const qrcodeCanvas = document.getElementById('qrcode');
    const downloadLink = document.getElementById('download');
    const foregroundColorInput = document.getElementById('foregroundColor');
    const backgroundColorInput = document.getElementById('backgroundColor');
    const transparentBackgroundCheckbox = document.getElementById('transparentBackground');
    const moduleStyleSelect = document.getElementById('moduleStyle');
    const logoUploadInput = document.getElementById('logoUpload');
    const logoPreview = document.getElementById('logoPreview');
    const removeLogoBtn = document.getElementById('removeLogo');
    const logoInfo = document.getElementById('logoInfo');
    const qrcodeContainer = document.getElementById('qrcode-container');

    let qr = null;
    let debounceTimer;
    let logoDataUrl = null;

    // Helper: generate a filename based on today's date and the QR code content.
    function generateFilename(content) {
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0'); // Month 01..12
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        // Remove "http://" or "https://", then trim and slice up to 64 characters.
        let stub = content.trim().replace(/^https?:\/\//i, '').slice(0, 64);
        // Replace any character that is not alphanumeric, dot, or hyphen with a hyphen.
        stub = stub.replace(/[^a-zA-Z0-9\-\.]/g, '-');

        if (!stub) {
            stub = 'qr-code';
        }
        return `${dateStr}-${stub}.png`;
    }
    function debounce(func, delay) {
        return function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(func, delay);
        };
    }

    // Initialize QR code instance
    function initQRCode() {
        qr = new QRious({
            element: qrcodeCanvas,
            size: 512,
            value: 'N/A',
            level: 'M', // default error correction level
            background: transparentBackgroundCheckbox.checked ? 'transparent' : 'white',
            foreground: 'grey',
            padding: 16 // safety margin
        });
    }

    // Apply module style (dots, rounded corners)
    function applyModuleStyle(style) {
        if (style === 'square') return;

        const ctx = qrcodeCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);
        const data = imageData.data;
        
        // Estimate module size by finding the first black module
        let moduleSize = 0;
        let padding = qr.padding || 16;
        let startX = padding;
        
        // Find first black pixel to determine module size
        for (let x = padding; x < qrcodeCanvas.width - padding; x++) {
            const idx = (padding * qrcodeCanvas.width + x) * 4;
            if (data[idx] < 128) { // Found black pixel
                startX = x;
                break;
            }
        }
        
        // Find end of first module
        for (let x = startX; x < qrcodeCanvas.width - padding; x++) {
            const idx = (padding * qrcodeCanvas.width + x) * 4;
            if (data[idx] > 128) { // Found white pixel
                moduleSize = x - startX;
                break;
            }
        }
        
        if (moduleSize === 0) return; // Could not determine module size
        
        const moduleCount = Math.floor((qrcodeCanvas.width - padding * 2) / moduleSize);

        // Clear canvas and redraw with new style
        ctx.clearRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);
        
        // Draw background only if not transparent
        if (qr.background !== 'transparent') {
            ctx.fillStyle = qr.background;
            ctx.fillRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);
        }
        
        // Set foreground color
        ctx.fillStyle = qr.foreground;

        // Scan the original image data to find modules
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                const x = padding + col * moduleSize + moduleSize / 2;
                const y = padding + row * moduleSize + moduleSize / 2;
                const idx = (Math.floor(y) * qrcodeCanvas.width + Math.floor(x)) * 4;
                
                // Check if this module is dark
                if (data[idx] < 128) {
                    const moduleX = padding + col * moduleSize;
                    const moduleY = padding + row * moduleSize;

                    if (style === 'dots') {
                        // Draw circles
                        ctx.beginPath();
                        ctx.arc(
                            moduleX + moduleSize / 2,
                            moduleY + moduleSize / 2,
                            moduleSize * 0.4,
                            0,
                            2 * Math.PI
                        );
                        ctx.fill();
                    } else if (style === 'rounded') {
                        // Draw rounded rectangles
                        const radius = moduleSize * 0.2;
                        ctx.beginPath();
                        ctx.moveTo(moduleX + radius, moduleY);
                        ctx.lineTo(moduleX + moduleSize - radius, moduleY);
                        ctx.quadraticCurveTo(moduleX + moduleSize, moduleY, moduleX + moduleSize, moduleY + radius);
                        ctx.lineTo(moduleX + moduleSize, moduleY + moduleSize - radius);
                        ctx.quadraticCurveTo(moduleX + moduleSize, moduleY + moduleSize, moduleX + moduleSize - radius, moduleY + moduleSize);
                        ctx.lineTo(moduleX + radius, moduleY + moduleSize);
                        ctx.quadraticCurveTo(moduleX, moduleY + moduleSize, moduleX, moduleY + moduleSize - radius);
                        ctx.lineTo(moduleX, moduleY + radius);
                        ctx.quadraticCurveTo(moduleX, moduleY, moduleX + radius, moduleY);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
        }
    }

    // Embed logo in QR code
    function embedLogo() {
        if (!logoDataUrl) return;

        const ctx = qrcodeCanvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const maxLogoSize = qrcodeCanvas.width * 0.2; // 20% of QR code size
            const margin = 8; // Margin around logo in pixels
            
            // Calculate size maintaining aspect ratio
            let logoWidth = img.width;
            let logoHeight = img.height;
            const aspectRatio = logoWidth / logoHeight;
            
            if (logoWidth > logoHeight) {
                logoWidth = maxLogoSize;
                logoHeight = maxLogoSize / aspectRatio;
            } else {
                logoHeight = maxLogoSize;
                logoWidth = maxLogoSize * aspectRatio;
            }
            
            const x = (qrcodeCanvas.width - logoWidth) / 2;
            const y = (qrcodeCanvas.height - logoHeight) / 2;
            
            // Clear background area for logo with margin
            const clearX = x - margin;
            const clearY = y - margin;
            const clearWidth = logoWidth + (margin * 2);
            const clearHeight = logoHeight + (margin * 2);
            
            // Save current composite operation
            const previousCompositeOperation = ctx.globalCompositeOperation;
            
            // Fill cleared area with background color (or transparent if needed)
            if (qr.background === 'transparent') {
                // Clear to transparent
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = 'rgba(0, 0, 0, 1)';
                ctx.fillRect(clearX, clearY, clearWidth, clearHeight);
                ctx.globalCompositeOperation = previousCompositeOperation;
            } else {
                // Fill with background color
                ctx.fillStyle = qr.background;
                ctx.fillRect(clearX, clearY, clearWidth, clearHeight);
            }
            
            // Draw logo
            ctx.drawImage(img, x, y, logoWidth, logoHeight);
            
            // Update download link after logo is embedded
            updateDownloadLink();
        };
        
        img.src = logoDataUrl;
    }

    // Generate QR code
    function generateQRCode() {
        const content = contentInput.value.trim();

        if (!content) {
            // Hide download link if no content
            downloadLink.style.display = 'none';
            // Clear the QR code (optional)
            qr.value = 'N/A';
            qr.foreground = 'grey';
            return;
        }

        const errorCorrection = errorCorrectionSelect.value;
        const foregroundColor = foregroundColorInput.value;
        const backgroundColor = transparentBackgroundCheckbox.checked ? 'transparent' : backgroundColorInput.value;
        const moduleStyle = moduleStyleSelect.value;

        // If logo is present, force high error correction
        if (logoDataUrl) {
            qr.level = 'H';
            errorCorrectionSelect.value = 'H';
            errorCorrectionSelect.disabled = true;
            logoInfo.style.display = 'block';
        } else {
            qr.level = errorCorrection;
            errorCorrectionSelect.disabled = false;
            logoInfo.style.display = 'none';
        }

        qr.value = content;
        qr.foreground = foregroundColor;
        qr.background = backgroundColor;

        // Apply module style if not square
        setTimeout(() => {
            applyModuleStyle(moduleStyle);
            // Embed logo after style is applied
            if (logoDataUrl) {
                embedLogo();
            } else {
                updateDownloadLink();
            }
        }, 50);

        // Show download link
        downloadLink.style.display = 'inline-block';
    }

    // Update download link with current canvas data and dynamic filename
    function updateDownloadLink() {
        const dataURL = qrcodeCanvas.toDataURL('image/png');
        downloadLink.href = dataURL;
        downloadLink.download = generateFilename(qr.value);
    }

    // Create debounced version of generate function
    const debouncedGenerate = debounce(generateQRCode, 200);

    // Event listeners
    contentInput.addEventListener('input', debouncedGenerate);
    errorCorrectionSelect.addEventListener('change', debouncedGenerate);
    foregroundColorInput.addEventListener('change', debouncedGenerate);
    backgroundColorInput.addEventListener('change', debouncedGenerate);
    moduleStyleSelect.addEventListener('change', debouncedGenerate);
    
    // Transparency checkbox handler
    transparentBackgroundCheckbox.addEventListener('change', function() {
        backgroundColorInput.disabled = this.checked;
        if (this.checked) {
            backgroundColorInput.style.opacity = '0.5';
            qrcodeContainer.classList.add('transparent-bg');
        } else {
            backgroundColorInput.style.opacity = '1';
            qrcodeContainer.classList.remove('transparent-bg');
        }
        debouncedGenerate();
    });

    // Logo upload handling
    logoUploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                logoDataUrl = event.target.result;
                logoPreview.innerHTML = `<img src="${logoDataUrl}" alt="Logo preview">`;
                removeLogoBtn.style.display = 'inline-block';
                errorCorrectionSelect.disabled = true;
                errorCorrectionSelect.value = 'H';
                logoInfo.style.display = 'block';
                debouncedGenerate();
            };
            reader.readAsDataURL(file);
        }
    });

    // Remove logo
    removeLogoBtn.addEventListener('click', function() {
        logoDataUrl = null;
        logoPreview.innerHTML = '';
        logoUploadInput.value = '';
        removeLogoBtn.style.display = 'none';
        errorCorrectionSelect.disabled = false;
        logoInfo.style.display = 'none';
        debouncedGenerate();
    });

    // Initialize
    initQRCode();
    // Generate empty QR code on initial load (optional)
    generateQRCode();
});
