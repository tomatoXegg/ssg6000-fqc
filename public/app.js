const form = document.getElementById('inspect-form');

if (form) {
  const items = Array.from(form.querySelectorAll('input[name="items"]'));
  const progressText = document.getElementById('progress-text');
  const progressBar = document.getElementById('progress-bar');
  const progressTag = document.getElementById('progress-tag');
  const progressWrap = form.querySelector('.progress-bar-bg');
  let submitting = false;

  function syncRow(input) {
    const row = input.closest('.check-item');
    if (row) row.classList.toggle('is-checked', input.checked);
  }

  function updateProgress() {
    const done = items.filter((input) => input.checked).length;
    const percent = items.length ? Math.round((done / items.length) * 100) : 0;

    if (progressText) progressText.textContent = `${done} / ${items.length} 项 (${percent}%)`;
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressWrap) progressWrap.setAttribute('aria-valuenow', String(done));
    if (progressTag) {
      const complete = done === items.length;
      progressTag.textContent = complete ? '已全检' : '检验中';
      progressTag.classList.toggle('is-complete', complete);
    }
  }

  form.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'items') {
      syncRow(event.target);
      updateProgress();
    }
  });

  form.querySelectorAll('[data-section-pass]').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.closest('.section-card');
      if (!section) return;

      section.querySelectorAll('input[name="items"]').forEach((input) => {
        input.checked = true;
        syncRow(input);
      });
      updateProgress();
    });
  });

  const snQuick = document.getElementById('sn-quick');
  const sn = document.getElementById('sn');

  if (snQuick && sn) {
    snQuick.addEventListener('input', () => { sn.value = snQuick.value; });
    sn.addEventListener('input', () => { snQuick.value = sn.value; });
  }

  form.addEventListener('submit', (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }
    submitting = true;
    // Disable after submission starts so the clicked button's intent is still sent.
    window.setTimeout(() => {
      form.querySelectorAll('button[type="submit"]').forEach((button) => {
        button.disabled = true;
      });
    }, 0);
  });
}

const copyButton = document.getElementById('copy-card');
const cardText = document.getElementById('pass-card-text');
const toastContainer = document.getElementById('toast-container');

function showToast(message) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  document.body.appendChild(area);
  area.select();

  const copied = document.execCommand('copy');
  area.remove();
  if (!copied) throw new Error('copy failed');
}

if (copyButton && cardText) {
  copyButton.addEventListener('click', async () => {
    const text = cardText.textContent ?? '';

    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else fallbackCopy(text);
      showToast('合格卡已复制到剪贴板');
    } catch {
      try {
        fallbackCopy(text);
        showToast('合格卡已复制到剪贴板');
      } catch {
        showToast('复制失败，请手动选择文本');
      }
    }
  });
}
