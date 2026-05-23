const API_BASE = 'https://api-hackathon.codedematrixtech.com';
const MERCHANT_SLUG = 'mensah';
const DEFAULT_WHATSAPP_NUMBER = '233264454344';
const IMAGE_BASE = API_BASE;
let allItems = [];
let selectedProduct = null;
let customSizingState = { step: 1, data: {} };
let modalListenersAdded = false;

window.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  initGlobalWhatsApp();
  const page = document.body.dataset.page;

  if (page === 'home') initHomePage();
  if (page === 'shop') initShopPage();
  if (page === 'cart') initCartPage();
});

function getCart() {
  return JSON.parse(localStorage.getItem('mensahCart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('mensahCart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('.cart-count').forEach((badge) => {
    badge.textContent = count;
  });
}

function formatPriceMinor(price_minor, currency = 'GHS') {
  const value = (Number(price_minor) / 100).toFixed(2);
  return currency === 'GHS' ? `GHS ${value}` : `${value} ${currency}`;
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

function fetchMerchant() {
  return fetchJson(`/merchants/${MERCHANT_SLUG}`);
}

function fetchCampaigns() {
  return fetchJson(`/merchants/${MERCHANT_SLUG}/campaigns`);
}

function fetchItems() {
  return fetchJson(`/merchants/${MERCHANT_SLUG}/items`);
}

async function createBasket(payload) {
  const response = await fetch(`${API_BASE}/baskets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Basket creation failed');
  return response.json();
}

function whatsappNumber() {
  return DEFAULT_WHATSAPP_NUMBER.replace(/\D/g, '');
}

function buildWhatsAppUrl(message) {
  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(message)}`;
}

async function uploadReferenceImage(file) {
  if (!file) return null;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/uploads`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.url || result.file_url || result.image_url || null;
  } catch (error) {
    console.warn('Reference image upload failed', error);
    return null;
  }
}

function initGlobalWhatsApp() {
  const btn = document.getElementById('floatingWhatsapp');
  if (!btn) return;
  btn.href = buildWhatsAppUrl('Hello Mensah, I would like to inquire about your collection.');
}

function renderSkeletonCards(container, count = 4) {
  if (!container) return;
  container.innerHTML = Array.from({ length: count })
    .map(
      () => `<article class="skeleton-card"><div class="skeleton-thumb"></div><div class="skeleton-line" style="width: 70%"></div><div class="skeleton-line" style="width: 100%"></div><div class="skeleton-line" style="width: 30%"></div></article>`
    )
    .join('');
}

function initHomePage() {
  const productGrid = document.getElementById('productGrid');
  renderSkeletonCards(productGrid, 4);

  const campaignTitle = document.getElementById('campaignTitle');
  const campaignCopy = document.getElementById('campaignCopy');
  const campaignVisual = document.getElementById('campaignVisual');

  fetchCampaigns()
    .then((campaigns) => {
      if (campaigns && campaigns.length) {
        const campaign = campaigns[0];
        campaignTitle.textContent = campaign.title || 'Mensah Campaign';
        campaignCopy.textContent = campaign.copy_text || 'Explore the latest editorial campaign.';
        if (campaign.image_urls && campaign.image_urls.length) {
          campaignVisual.style.backgroundImage = `url('${IMAGE_BASE}${campaign.image_urls[0]}')`;
        }
      } else {
        campaignTitle.textContent = 'No campaign available';
        campaignCopy.textContent = 'Please check back soon for the latest offers.';
      }
    })
    .catch(() => {
      campaignTitle.textContent = 'Campaign unavailable';
      campaignCopy.textContent = 'Please refresh the page to try again.';
    });

  fetchItems()
    .then((items) => {
      allItems = decorateItems(items);
      const featured = allItems.slice(0, 4);
      renderFeaturedProducts(featured);
    })
    .catch(() => {
      if (productGrid) {
        productGrid.innerHTML = `<div class="empty-state"><p>Unable to load featured products at the moment. Please refresh.</p></div>`;
      }
    });

  const bespokeForm = document.getElementById('bespokeForm');
  if (bespokeForm) {
    bespokeForm.addEventListener('submit', handleBespokeSubmit);
  }

  initPageInteractions();
}

function decorateItems(items) {
  return (items || []).map((item) => ({
    ...item,
    category: item.name.split(' ')[0] || 'Mensah',
    available_sizes: ['S', 'M', 'L', 'XL'],
  }));
}

let heroCarouselInterval = null;
let heroCarouselIndex = 0;
let heroCarouselItems = [];

function renderFeaturedProducts(items) {
  const productGrid = document.getElementById('productGrid');
  if (!productGrid) return;
  if (!items || !items.length) {
    productGrid.innerHTML = `<div class="empty-state"><p>No featured items available.</p></div>`;
    return;
  }

  productGrid.innerHTML = items
    .map((item) => {
      const imageStyle = item.image_urls?.[0]
        ? `style="background-image:url('${IMAGE_BASE}${item.image_urls[0]}');background-size:cover;background-position:center;"`
        : '';
      return `<article class="product-card"><div class="product-image" ${imageStyle}>${!item.image_urls?.[0] ? item.name : ''}</div><div class="product-meta"><h3>${item.name}</h3><p>${item.description || 'Classic tailoring ready for you.'}</p></div><div class="product-footer"><span class="price-tag">${formatPriceMinor(item.price_minor, item.currency)}</span><button type="button" data-product-id="${item.id}" class="view-product">View</button></div></article>`;
    })
    .join('');

  document.querySelectorAll('.view-product').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.productId;
      const item = allItems.find((product) => product.id === id);
      if (item) openProductModal(item);
    });
  });
}

function renderHeroCarousel(items) {
  heroCarouselItems = items || [];
  const carousel = document.getElementById('heroCarousel');
  if (!carousel) return;
  const slideContainer = carousel.querySelector('.carousel-slides');
  if (!slideContainer) return;

  if (!heroCarouselItems.length) {
    slideContainer.innerHTML = `<div class="carousel-slide active"><div class="carousel-overlay"><p class="eyebrow">Mensah</p><h3>Signature Tailoring</h3><p>Discover our most refined pieces in a rotating hero showcase.</p></div></div>`;
    return;
  }

  slideContainer.innerHTML = heroCarouselItems
    .map((item, index) => {
      const backgroundImage = item.image_urls?.[0] ? `${IMAGE_BASE}${item.image_urls[0]}` : '';
      return `<article class="carousel-slide${index === 0 ? ' active' : ''}" data-product-id="${item.id}" style="background-image: url('${backgroundImage}');">
          <div class="carousel-overlay">
            <span class="eyebrow">Featured</span>
            <h3>${item.name}</h3>
            <p>${item.description || 'Classic tailoring ready for you.'}</p>
            <span class="price-tag">${formatPriceMinor(item.price_minor, item.currency)}</span>
            <button type="button" class="button button-primary carousel-view-button" data-product-id="${item.id}">View</button>
          </div>
        </article>`;
    })
    .join('');

  initHeroCarousel();
  setHeroCarouselIndex(0);
  startHeroCarouselTimer();
}

function initHeroCarousel() {
  const carousel = document.getElementById('heroCarousel');
  if (!carousel) return;

  carousel.querySelectorAll('.carousel-view-button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.productId;
      const item = allItems.find((product) => product.id === id);
      if (item) openProductModal(item);
    });
  });

  carousel.querySelector('.carousel-prev')?.addEventListener('click', () => {
    setHeroCarouselIndex(heroCarouselIndex - 1);
    startHeroCarouselTimer();
  });

  carousel.querySelector('.carousel-next')?.addEventListener('click', () => {
    setHeroCarouselIndex(heroCarouselIndex + 1);
    startHeroCarouselTimer();
  });
}

function setHeroCarouselIndex(index) {
  if (!heroCarouselItems.length) return;
  heroCarouselIndex = (index + heroCarouselItems.length) % heroCarouselItems.length;
  document.querySelectorAll('#heroCarousel .carousel-slide').forEach((slide, slideIndex) => {
    slide.classList.toggle('active', slideIndex === heroCarouselIndex);
  });
}

function startHeroCarouselTimer() {
  if (heroCarouselInterval) {
    clearInterval(heroCarouselInterval);
  }
  heroCarouselInterval = setInterval(() => {
    setHeroCarouselIndex(heroCarouselIndex + 1);
  }, 6000);
}

function initShopPage() {
  const shopGrid = document.getElementById('shopGrid');
  renderSkeletonCards(shopGrid, 6);

  fetchItems()
    .then((items) => {
      allItems = decorateItems(items);
      renderShopFilters(allItems);
      renderShopGrid(allItems);
      initShopEvents();
      initPageInteractions();
    })
    .catch(() => {
      if (shopGrid) {
        shopGrid.innerHTML = `<div class="empty-state"><p>Unable to load inventory. Please refresh.</p></div>`;
      }
    });

  const bespokeStart = document.getElementById('bespokeStart');
  if (bespokeStart) {
    bespokeStart.addEventListener('click', (event) => {
      event.preventDefault();
      openCustomSizingModal();
    });
  }
}

function renderShopFilters(items) {
  const categorySelect = document.getElementById('categorySelect');
  const sizeSelect = document.getElementById('sizeSelect');
  const priceSelect = document.getElementById('priceSelect');

  if (!categorySelect || !sizeSelect || !priceSelect) return;

  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const sizes = Array.from(new Set(items.flatMap((item) => item.available_sizes))).sort();
  const prices = items.map((item) => item.price_minor);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  categorySelect.innerHTML = `<option value="all">All Categories</option>${categories.map((category) => `<option value="${category}">${category}</option>`).join('')}`;
  sizeSelect.innerHTML = `<option value="all">All Sizes</option>${sizes.map((size) => `<option value="${size}">${size}</option>`).join('')}`;
  priceSelect.innerHTML = `
    <option value="all">All Prices</option>
    <option value="under-${Math.ceil((min + max) / 2)}">Below ${formatPriceMinor(Math.ceil((min + max) / 2), 'GHS')}</option>
    <option value="over-${Math.ceil((min + max) / 2)}">Above ${formatPriceMinor(Math.ceil((min + max) / 2), 'GHS')}</option>
  `;
}

function initShopEvents() {
  const categorySelect = document.getElementById('categorySelect');
  const sizeSelect = document.getElementById('sizeSelect');
  const priceSelect = document.getElementById('priceSelect');
  const sortSelect = document.getElementById('sortSelect');

  [categorySelect, sizeSelect, priceSelect, sortSelect].forEach((select) => {
    if (select) select.addEventListener('change', applyShopFilters);
  });
}

function applyShopFilters() {
  const category = document.getElementById('categorySelect')?.value || 'all';
  const size = document.getElementById('sizeSelect')?.value || 'all';
  const price = document.getElementById('priceSelect')?.value || 'all';
  const sort = document.getElementById('sortSelect')?.value || 'newest';

  let filtered = [...allItems];

  if (category !== 'all') {
    filtered = filtered.filter((item) => item.category === category);
  }
  if (size !== 'all') {
    filtered = filtered.filter((item) => item.available_sizes.includes(size));
  }
  if (price.startsWith('under-')) {
    const threshold = Number(price.replace('under-', ''));
    filtered = filtered.filter((item) => item.price_minor <= threshold);
  }
  if (price.startsWith('over-')) {
    const threshold = Number(price.replace('over-', ''));
    filtered = filtered.filter((item) => item.price_minor >= threshold);
  }

  if (sort === 'price-asc') {
    filtered.sort((a, b) => a.price_minor - b.price_minor);
  }
  if (sort === 'price-desc') {
    filtered.sort((a, b) => b.price_minor - a.price_minor);
  }

  renderShopGrid(filtered);
}

function renderShopGrid(items) {
  const shopGrid = document.getElementById('shopGrid');
  if (!shopGrid) return;

  if (!items || !items.length) {
    shopGrid.innerHTML = `<div class="empty-state"><p>No products match your selected filters.</p></div>`;
    return;
  }

  shopGrid.innerHTML = items
    .map((item) => {
      const imageStyle = item.image_urls?.[0]
        ? `style="background-image:url('${IMAGE_BASE}${item.image_urls[0]}');background-size:cover;background-position:center;"`
        : '';
      const stockLabel = item.in_stock ? 'In stock' : 'Out of stock';
      const actionLabel = item.in_stock ? 'Quick View' : 'Order Custom Size';
      const disabledClass = item.in_stock ? '' : 'disabled-card';
      return `<article class="product-card ${disabledClass}"><div class="product-image" ${imageStyle}>${!item.image_urls?.[0] ? item.name : ''}</div><div class="product-meta"><h3>${item.name}</h3><p>${item.description || 'Premium tailoring from Mensah.'}</p></div><div class="product-footer"><span class="price-tag">${formatPriceMinor(item.price_minor, item.currency)}</span><button type="button" data-product-id="${item.id}" class="shop-view-button">${actionLabel}</button></div><p class="stock-status">${stockLabel}</p></article>`;
    })
    .join('');

  document.querySelectorAll('.shop-view-button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.productId;
      const item = allItems.find((product) => product.id === id);
      if (item) openProductModal(item);
    });
  });
}

function openProductModal(item) {
  selectedProduct = item;
  const modal = document.getElementById('productModal');
  if (!modal) return;
  const title = document.getElementById('modalTitle');
  const price = document.getElementById('modalPrice');
  const copy = document.getElementById('modalCopy');
  const stock = document.getElementById('modalStock');
  const image = document.getElementById('modalImage');
  const category = document.getElementById('modalCategory');
  const sizeSelect = document.getElementById('productSizeSelect');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const orderCustomBtn = document.getElementById('orderCustomBtn');
  const sizingFlow = document.getElementById('sizingFlow');

  if (!title || !price || !copy || !stock || !image || !category || !sizeSelect || !addToCartBtn || !orderCustomBtn) return;

  title.textContent = item.name;
  price.textContent = formatPriceMinor(item.price_minor, item.currency);
  copy.textContent = item.description || 'A tailored essential from the Mensah collection.';
  stock.textContent = item.in_stock ? 'In stock for immediate purchase' : 'Currently out of stock';
  category.textContent = item.category || 'Tailoring';
  image.src = item.image_urls?.[0] ? `${IMAGE_BASE}${item.image_urls[0]}` : '';
  image.alt = item.name;

  sizeSelect.innerHTML = item.available_sizes
    .map((size) => `<option value="${size}">${size}</option>`)
    .join('');

  addToCartBtn.disabled = !item.in_stock;
  addToCartBtn.textContent = item.in_stock ? 'Add to Cart' : 'Unavailable';
  orderCustomBtn.textContent = 'Order Custom Size';

  if (sizingFlow) {
    sizingFlow.classList.add('hidden');
    setSizingStep(1);
  }

  modal.classList.add('open');
  trapModalClose();
}

function openCustomSizingModal() {
  selectedProduct = null;
  const modal = document.getElementById('productModal');
  if (!modal) return;
  const title = document.getElementById('modalTitle');
  const price = document.getElementById('modalPrice');
  const copy = document.getElementById('modalCopy');
  const stock = document.getElementById('modalStock');
  const image = document.getElementById('modalImage');
  const category = document.getElementById('modalCategory');
  const sizeSelect = document.getElementById('productSizeSelect');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const orderCustomBtn = document.getElementById('orderCustomBtn');
  const sizingFlow = document.getElementById('sizingFlow');

  if (!title || !price || !copy || !stock || !image || !category || !sizeSelect || !addToCartBtn || !orderCustomBtn) return;

  title.textContent = 'Custom Tailoring Request';
  price.textContent = '';
  copy.textContent = 'Provide your measurements and fit preferences to begin a custom order with Mensah.';
  stock.textContent = 'Custom fit via WhatsApp';
  category.textContent = 'Bespoke';
  image.src = '';
  image.alt = 'Custom order';
  sizeSelect.innerHTML = '<option value="M">M</option><option value="L">L</option><option value="S">S</option><option value="XL">XL</option>';

  addToCartBtn.disabled = true;
  addToCartBtn.textContent = 'Add to Cart';
  orderCustomBtn.textContent = 'Continue to Custom Order';

  if (sizingFlow) {
    sizingFlow.classList.remove('hidden');
    setSizingStep(1);
  }

  const referencePhotoInput = document.getElementById('referencePhoto');
  const referencePreview = document.getElementById('referencePreview');
  if (referencePhotoInput) referencePhotoInput.value = '';
  if (referencePreview) {
    referencePreview.innerHTML = '';
    referencePreview.classList.remove('visible');
  }

  modal.classList.add('open');
  trapModalClose();
}

function trapModalClose() {
  const modal = document.getElementById('productModal');
  if (!modal || modalListenersAdded) return;
  const closeButton = document.getElementById('closeModal');
  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', handleEscapeClose);
  modalListenersAdded = true;
}

function handleEscapeClose(event) {
  if (event.key === 'Escape') closeModal();
}

function closeModal() {
  const modal = document.getElementById('productModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.removeEventListener('keydown', handleEscapeClose);
}

function handleBespokeSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  const phone = form.phone?.value.trim() || '';
  const fit = form.fit.value;
  const notes = form.notes.value.trim();

  if (!name || !fit) {
    alert('Please complete the required fields before submitting.');
    return;
  }

  const message = `Hello Mensah.

I would like to request a bespoke consultation.

Name: ${name}
Phone: ${phone}
Preferred fit: ${fit}
Notes: ${notes || 'None'}`;
  window.open(buildWhatsAppUrl(message), '_blank');
}

function handleAddToCart() {
  if (!selectedProduct || !selectedProduct.in_stock) return;
  const size = document.getElementById('productSizeSelect')?.value || 'M';
  const cart = getCart();
  const cartKey = `${selectedProduct.id}|${size}|standard`;
  const existingIndex = cart.findIndex((item) => item.key === cartKey);

  if (existingIndex !== -1) {
    cart[existingIndex].qty += 1;
  } else {
    cart.push({
      key: cartKey,
      item_id: selectedProduct.id,
      id: selectedProduct.id,
      name: selectedProduct.name,
      price_minor: selectedProduct.price_minor,
      currency: selectedProduct.currency,
      qty: 1,
      size,
      custom_fit: false,
      image: selectedProduct.image_urls?.[0] ? `${IMAGE_BASE}${selectedProduct.image_urls[0]}` : '',
      note: 'Standard size',
    });
  }

  saveCart(cart);
  alert('Added to cart successfully.');
  closeModal();
}

function handleOrderCustomSize() {
  const sizingFlow = document.getElementById('sizingFlow');
  if (!sizingFlow) return;
  sizingFlow.classList.remove('hidden');
  setSizingStep(1);
}

function setSizingStep(step) {
  customSizingState.step = step;
  const steps = [1, 2, 3, 4];
  steps.forEach((stepNumber) => {
    const element = document.getElementById(`sizingStep${stepNumber}`);
    if (element) {
      element.classList.toggle('hidden', customSizingState.step !== stepNumber);
    }
  });
}

function collectSizingData() {
  return {
    chest: document.getElementById('measureChest')?.value.trim(),
    waist: document.getElementById('measureWaist')?.value.trim(),
    hips: document.getElementById('measureHips')?.value.trim(),
    shoulder: document.getElementById('measureShoulder')?.value.trim(),
    sleeve: document.getElementById('measureSleeve')?.value.trim(),
    inseam: document.getElementById('measureInseam')?.value.trim(),
    height: document.getElementById('measureHeight')?.value.trim(),
    weight: document.getElementById('measureWeight')?.value.trim(),
    notes: document.getElementById('measureNotes')?.value.trim(),
    fitStyle: document.getElementById('fitStyle')?.value,
    customStyle: document.getElementById('customStyle')?.value,
    fabric: document.getElementById('fabricPreference')?.value.trim(),
    referencePhotoName: document.getElementById('referencePhoto')?.files?.[0]?.name || '',
  };
}

function handleReferencePhotoChange(event) {
  const input = event.target;
  const preview = document.getElementById('referencePreview');
  const file = input?.files?.[0];

  if (!preview) return;
  if (file) {
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" alt="Reference preview" />`;
    preview.classList.add('visible');
  } else {
    preview.innerHTML = '';
    preview.classList.remove('visible');
  }
}

function validateStep1(data) {
  return data.chest && data.waist && data.hips && data.shoulder && data.sleeve && data.inseam;
}

function handleToStep2() {
  const data = collectSizingData();
  if (!validateStep1(data)) {
    alert('Please fill all required measurements to continue.');
    return;
  }
  customSizingState.data = { ...customSizingState.data, ...data };
  setSizingStep(2);
}

function handleBackToStep1() {
  setSizingStep(1);
}

function handleToStep3() {
  const data = collectSizingData();
  customSizingState.data = { ...customSizingState.data, ...data };
  renderSizingReview();
  setSizingStep(3);
}

function renderSizingReview() {
  const summary = document.getElementById('orderSummary');
  if (!summary) return;
  const data = customSizingState.data;
  const productTitle = selectedProduct ? selectedProduct.name : 'Custom tailoring request';
  summary.innerHTML = `
    <p><strong>Product:</strong> ${productTitle}</p>
    <p><strong>Chest:</strong> ${data.chest} cm</p>
    <p><strong>Waist:</strong> ${data.waist} cm</p>
    <p><strong>Hips:</strong> ${data.hips} cm</p>
    <p><strong>Shoulder:</strong> ${data.shoulder} cm</p>
    <p><strong>Sleeve:</strong> ${data.sleeve} cm</p>
    <p><strong>Inseam:</strong> ${data.inseam} cm</p>
    <p><strong>Height:</strong> ${data.height || 'N/A'}</p>
    <p><strong>Weight:</strong> ${data.weight || 'N/A'}</p>
    <p><strong>Fit style:</strong> ${data.fitStyle || 'Regular'}</p>
    <p><strong>Custom style:</strong> ${data.customStyle || 'No preference'}</p>
    <p><strong>Fabric preference:</strong> ${data.fabric || 'No preference'}</p>
    <p><strong>Reference image:</strong> ${data.referencePhotoName || 'None uploaded'}</p>
    <p><strong>Notes:</strong> ${data.notes || 'None'}</p>
  `;
}

function handleBackToStep2() {
  setSizingStep(2);
}

function handleSubmitCustomOrder() {
  const data = collectSizingData();
  if (!data.fitStyle) {
    alert('Please select your fit style.');
    return;
  }
  customSizingState.data = { ...customSizingState.data, ...data };
  renderSizingReview();
  setSizingStep(4);
}

async function handleConfirmCustomOrder() {
  const data = customSizingState.data;
  if (!data.fitStyle) {
    alert('Please select your fit style.');
    setSizingStep(2);
    return;
  }

  const photoFile = document.getElementById('referencePhoto')?.files?.[0];
  if (photoFile && !data.referenceImageUrl) {
    data.referenceImageUrl = await uploadReferenceImage(photoFile);
  }

  const productText = selectedProduct ? `${selectedProduct.name}` : 'Custom tailoring request';
  let message = `Hello Mensah.

I would like to request a custom order.

Product: ${productText}

Chest: ${data.chest} cm
Waist: ${data.waist} cm
Hips: ${data.hips} cm
Shoulder: ${data.shoulder} cm
Sleeve: ${data.sleeve} cm
Inseam: ${data.inseam} cm
Height: ${data.height || 'N/A'}
Weight: ${data.weight || 'N/A'}
Fit style: ${data.fitStyle}
Custom style: ${data.customStyle || 'No preference'}
Fabric: ${data.fabric || 'N/A'}
Notes: ${data.notes || 'None'}`;

  if (data.referenceImageUrl) {
    message += `\nReference image: ${data.referenceImageUrl}`;
  } else if (data.referencePhotoName) {
    message += `\nReference image: ${data.referencePhotoName} (attached via form)`;
  }

  message += `\n\nTailoring fee will be confirmed via WhatsApp.`;

  window.open(buildWhatsAppUrl(message), '_blank');
  alert('Your request has been prepared. Mensah will reach out on WhatsApp shortly.');
  closeModal();
}

function initCartPage() {
  renderCartSummary();
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckoutSubmit);
}

function renderCartSummary() {
  const cartSummary = document.getElementById('cartSummary');
  const cart = getCart();
  if (!cartSummary) return;

  if (!cart.length) {
    cartSummary.innerHTML = `
      <div class="empty-state">
        <p>Your cart is empty.</p>
        <a href="shop.html" class="button button-primary">Back to Shop</a>
      </div>
    `;
    document.getElementById('checkoutSubtotal').textContent = formatPriceMinor(0);
    return;
  }

  const rows = cart
    .map((item) => {
      const note = item.custom_fit ? 'Custom Fit' : `Size ${item.size}`;
      return `
        <tr>
          <td>
            <div class="cart-item-meta">
              <p class="cart-item-name">${item.name}</p>
              <p>${note}</p>
            </div>
          </td>
          <td>${formatPriceMinor(item.price_minor, item.currency)}</td>
          <td><input type="number" min="1" value="${item.qty}" data-cart-key="${item.key}" class="quantity-input" /></td>
          <td>${formatPriceMinor(item.price_minor * item.qty, item.currency)}</td>
          <td><button type="button" class="remove-button" data-cart-key="${item.key}">Remove</button></td>
        </tr>
      `;
    })
    .join('');

  cartSummary.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr><th>Item</th><th>Unit</th><th>Qty</th><th>Total</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.querySelectorAll('.quantity-input').forEach((input) => {
    input.addEventListener('change', handleQuantityChange);
  });

  document.querySelectorAll('.remove-button').forEach((button) => {
    button.addEventListener('click', handleRemoveItem);
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price_minor * item.qty, 0);
  document.getElementById('checkoutSubtotal').textContent = formatPriceMinor(subtotal);
}

function handleQuantityChange(event) {
  const target = event.target;
  const key = target.dataset.cartKey;
  const qty = Number(target.value);
  if (!key || qty < 1) return;
  const cart = getCart();
  const item = cart.find((row) => row.key === key);
  if (!item) return;
  item.qty = qty;
  saveCart(cart);
  renderCartSummary();
}

function handleRemoveItem(event) {
  const key = event.target.dataset.cartKey;
  if (!key) return;
  const cart = getCart().filter((item) => item.key !== key);
  saveCart(cart);
  renderCartSummary();
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  const cart = getCart();
  if (!cart.length) {
    alert('Add items to your cart before checking out.');
    return;
  }

  const name = document.getElementById('customerName')?.value.trim();
  const phone = document.getElementById('customerPhone')?.value.trim();
  const address = document.getElementById('customerAddress')?.value.trim();
  const note = document.getElementById('customerNote')?.value.trim();

  if (!name || !phone || !address) {
    alert('Please fill all required checkout fields.');
    return;
  }

  const items = cart.map((item) => ({
    item_id: item.item_id,
    qty: item.qty,
    item_note: `${item.custom_fit ? 'Custom Fit' : `Size ${item.size}`} ${item.note}`,
  }));

  const payload = {
    merchant_id: MERCHANT_SLUG,
    items,
    customer_name: name,
    customer_phone: phone,
    customer_note: note,
  };

  try {
    await createBasket(payload);
  } catch (error) {
    console.warn('Basket creation failed:', error);
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price_minor * item.qty, 0);
  const messageLines = [`Hello Mensah,`, '', `I have placed an order via the Mensah cart.`, '', `Name: ${name}`, `Phone: ${phone}`, `Address: ${address}`, '', `Order details:`];
  cart.forEach((item) => {
    const sizeText = item.custom_fit ? 'Custom Fit' : `Size ${item.size}`;
    const lineTotal = formatPriceMinor(item.price_minor * item.qty, item.currency);
    messageLines.push(`- ${item.name} (${sizeText}) x${item.qty} — ${lineTotal}`);
  });
  messageLines.push('', `Final amount: ${formatPriceMinor(subtotal)}`);
  if (note) messageLines.push('', `Notes: ${note}`);
  messageLines.push('', 'Please confirm the delivery and final pricing via WhatsApp.');

  window.open(buildWhatsAppUrl(messageLines.join('\n')), '_blank');
  saveCart([]);
  renderCartSummary();
  alert('Your order has been sent! We will confirm details and delivery shortly.');
}

function openProductDetail(productId) {
  const item = allItems.find((product) => product.id === productId);
  if (item) openProductModal(item);
}

function updateShopButtons() {
  const addToCartBtn = document.getElementById('addToCartBtn');
  const orderCustomBtn = document.getElementById('orderCustomBtn');
  if (addToCartBtn) addToCartBtn.addEventListener('click', handleAddToCart);
  if (orderCustomBtn) orderCustomBtn.addEventListener('click', handleOrderCustomSize);
}

function bindSizingEvents() {
  document.getElementById('toStep2')?.addEventListener('click', handleToStep2);
  document.getElementById('backToStep1')?.addEventListener('click', handleBackToStep1);
  document.getElementById('toStep3')?.addEventListener('click', handleToStep3);
  document.getElementById('backToStep2')?.addEventListener('click', handleBackToStep2);
  document.getElementById('submitCustomOrder')?.addEventListener('click', handleSubmitCustomOrder);
  document.getElementById('confirmCustomOrder')?.addEventListener('click', handleConfirmCustomOrder);
  document.getElementById('referencePhoto')?.addEventListener('change', handleReferencePhotoChange);
}

function initPageInteractions() {
  updateShopButtons();
  bindSizingEvents();
}
