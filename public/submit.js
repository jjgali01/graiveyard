// ===================== STARS =====================
function createStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  for (let i = 0; i < 80; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() < 0.6 ? 2 : 4;
    star.style.cssText = `
      width: ${size}px; height: ${size}px;
      top: ${Math.random() * 60}%;
      left: ${Math.random() * 100}%;
      --dur: ${2 + Math.random() * 4}s;
      --delay: ${Math.random() * 4}s;
    `;
    container.appendChild(star);
  }
}

// ===================== FORM =====================
document.addEventListener('DOMContentLoaded', () => {
  createStars();

  const form = document.getElementById('memorial-form');
  const textarea = document.getElementById('text');
  const charSpan = document.getElementById('chars');
  const imageInput = document.getElementById('image');
  const imagePreview = document.getElementById('image-preview');
  const dropHint = document.getElementById('drop-hint');
  const dropArea = document.getElementById('image-drop-area');
  const submitBtn = document.getElementById('submit-btn');
  const successMsg = document.getElementById('success-msg');
  const successEpitaph = document.getElementById('success-epitaph');

  // Character count
  textarea.addEventListener('input', () => {
    charSpan.textContent = textarea.value.length;
  });

  // Image preview
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) showPreview(file);
  });

  // Drag and drop
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      showPreview(file);
      // Attach to the file input (for form submission)
      const dt = new DataTransfer();
      dt.items.add(file);
      imageInput.files = dt.files;
    }
  });

  function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.classList.remove('hidden');
      dropHint.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ GRIEVING...';

    const formData = new FormData(form);

    try {
      const res = await fetch('/api/memorials', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Something went wrong.');
        return;
      }

      const memorial = await res.json();

      // Show success state
      form.classList.add('hidden');
      successEpitaph.textContent = memorial.text;
      successMsg.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      alert('Failed to submit. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'GRIEVE IT';
    }
  });
});
