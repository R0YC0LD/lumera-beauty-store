"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  badge?: string;
  tone: string;
};

type CartLine = Product & { quantity: number };

const products: Product[] = [
  { id: 1, name: "Barrier Cloud Nem Kremi", brand: "Aster Lab", category: "Cilt Bakımı", price: 649, oldPrice: 799, rating: 4.9, badge: "Çok Satan", tone: "peach" },
  { id: 2, name: "Dew Drop Peptit Serum", brand: "Noa Rituals", category: "Cilt Bakımı", price: 729, rating: 4.8, badge: "Yeni", tone: "lilac" },
  { id: 3, name: "Velvet Tint 04 — Guava", brand: "Mori", category: "Makyaj", price: 419, oldPrice: 499, rating: 4.7, badge: "%16", tone: "coral" },
  { id: 4, name: "Solar Veil SPF 50+", brand: "Serein", category: "Güneş", price: 589, rating: 4.9, badge: "Editörün Seçimi", tone: "sun" },
  { id: 5, name: "Neroli Skin Parfüm", brand: "Maison Lune", category: "Parfüm", price: 1190, rating: 4.8, tone: "rose" },
  { id: 6, name: "Silk Reset Saç Maskesi", brand: "Onda", category: "Saç Bakımı", price: 539, oldPrice: 620, rating: 4.6, badge: "Fırsat", tone: "sage" },
  { id: 7, name: "Soft Melt Temizleme Balmı", brand: "Aster Lab", category: "Cilt Bakımı", price: 489, rating: 4.9, tone: "cream" },
  { id: 8, name: "Moon Milk Vücut Losyonu", brand: "Noa Rituals", category: "Vücut", price: 445, rating: 4.7, badge: "Yeni", tone: "blue" },
];

const categories = [
  ["Cilt bakımı", "Işığını geri kazan", "skin"],
  ["Makyaj", "Rengini özgür bırak", "makeup"],
  ["Saç bakımı", "Kökten uca ritüel", "hair"],
  ["Parfüm", "İmzanı bırak", "scent"],
  ["Güneş", "Işığa hazır", "sun"],
  ["K-Beauty", "Seul'den seçkiler", "kbeauty"],
];

const initialSettings = {
  announcement: "₺1.000 ve üzeri alışverişlerde kargo bizden · Aynı gün hızlı gönderim",
  heroEyebrow: "YENİ NESİL GÜZELLİK SEÇKİSİ",
  heroTitle: "Işığını bul.\nRitüelini yarat.",
  heroCopy: "Cildini dinleyen, dünyaya nazik ve sonuçlarıyla güçlü seçkiler. Her ürün uzman editörlerimiz tarafından incelendi.",
  shippingThreshold: 1000,
  loyaltyRate: 5,
  provider: "iyzico",
  threeDSecure: true,
  testMode: true,
  bankTransfer: true,
  cashOnDelivery: false,
  installments: [2, 3, 6, 9],
};

const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`} aria-label="Luméra">
      <span className="brand-word">luméra</span><i className="brand-dot" /><i className="brand-spark" />
      {!compact && <small>BEAUTY STORE</small>}
    </span>
  );
}

function IconButton({ label, children, onClick, badge }: { label: string; children: React.ReactNode; onClick?: () => void; badge?: number }) {
  return <button className="icon-btn" aria-label={label} onClick={onClick}>{children}{badge ? <b>{badge}</b> : null}</button>;
}

function ProductArt({ tone, small = false }: { tone: string; small?: boolean }) {
  return <div className={`product-art tone-${tone} ${small ? "small" : ""}`} aria-hidden="true"><span className="halo" /><span className="bottle"><i /></span><span className="orb" /></div>;
}

function ProductCard({ product, onAdd, onOpen, favorite, onFavorite }: { product: Product; onAdd: () => void; onOpen: () => void; favorite: boolean; onFavorite: () => void }) {
  return (
    <article className="product-card">
      <button className="product-open" onClick={onOpen} aria-label={`${product.name} detayını aç`}>
        <div className="product-image">{product.badge && <span className="badge">{product.badge}</span>}<ProductArt tone={product.tone} /></div>
      </button>
      <button className={`heart ${favorite ? "active" : ""}`} aria-label="Favoriye ekle" onClick={onFavorite}>♡</button>
      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <button className="product-name" onClick={onOpen}>{product.name}</button>
        <span className="rating">★ {product.rating} <em>(128)</em></span>
        <div className="price-row"><strong>{money(product.price)}</strong>{product.oldPrice && <del>{money(product.oldPrice)}</del>}<button className="quick-add" onClick={onAdd} aria-label="Sepete ekle">+</button></div>
      </div>
    </article>
  );
}

function Storefront({ settings, setAdmin, notify }: { settings: typeof initialSettings; setAdmin: () => void; notify: (s: string) => void }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cookie, setCookie] = useState(true);
  const [checkout, setCheckout] = useState(false);
  const logoClicks = useRef({ count: 0, timer: 0 });

  useEffect(() => {
    const saved = localStorage.getItem("lumera-cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => { localStorage.setItem("lumera-cart", JSON.stringify(cart)); }, [cart]);

  const add = (product: Product) => {
    setCart(lines => lines.some(line => line.id === product.id) ? lines.map(line => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...lines, { ...product, quantity: 1 }]);
    notify(`${product.name} sepete eklendi`);
  };
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const searchResults = useMemo(() => products.filter(p => `${p.name} ${p.brand} ${p.category}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))), [query]);
  const handleLogoClick = () => {
    logoClicks.current.count += 1;
    window.clearTimeout(logoClicks.current.timer);
    logoClicks.current.timer = window.setTimeout(() => { logoClicks.current.count = 0; }, 1600);
    if (logoClicks.current.count >= 5) {
      logoClicks.current.count = 0;
      setAdmin();
    } else if (logoClicks.current.count === 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return <div className="storefront">
    <div className="announcement"><span className="marquee">{settings.announcement}<i>✦</i>{settings.announcement}</span></div>
    <header className="site-header">
      <div className="header-main shell">
        <button className="mobile-menu" aria-label="Menü">☰</button>
        <button className="logo-link" onClick={handleLogoClick} aria-label="Luméra ana sayfa"><Brand /></button>
        <button className="search-pill" onClick={() => setSearchOpen(true)}><span>⌕</span> Ürün, marka veya içerik ara… <kbd>⌘ K</kbd></button>
        <nav className="header-actions" aria-label="Kullanıcı işlemleri">
          <IconButton label="Favoriler" badge={favorites.length}>♡</IconButton>
          <IconButton label="Hesabım">♙</IconButton>
          <IconButton label="Sepet" badge={cartCount} onClick={() => setCartOpen(true)}>◯</IconButton>
        </nav>
      </div>
      <nav className="category-nav shell" aria-label="Kategoriler">
        <a href="#urunler">Yeni</a><a href="#kategoriler">Cilt Bakımı</a><a href="#kategoriler">Makyaj</a><a href="#kategoriler">Saç</a><a href="#kategoriler">Parfüm</a><a href="#markalar">Markalar</a><a className="sale" href="#urunler">İndirim</a>
      </nav>
    </header>

    <main id="top">
      <section className="hero">
        <img src="/lumera-hero.png" alt="Luméra'nın seçilmiş bakım ve makyaj ürünleri" />
        <div className="hero-shade" />
        <div className="hero-content shell">
          <span className="eyebrow">{settings.heroEyebrow}</span>
          <h1>{settings.heroTitle.split("\n").map((line, i) => <span key={i}>{line}</span>)}</h1>
          <p>{settings.heroCopy}</p>
          <div className="hero-actions"><a className="btn dark" href="#urunler">Seçkiyi keşfet <span>→</span></a><a className="text-link" href="#rituel">Cilt testini çöz <span>↗</span></a></div>
          <div className="hero-proof"><div className="avatar-stack"><i /><i /><i /></div><span><b>4.9 / 5</b><br />12.000+ mutlu ritüel</span></div>
        </div>
        <span className="hero-note">01 / YAZ SEÇKİSİ</span>
      </section>

      <section className="trust-strip shell" aria-label="Alışveriş avantajları">
        <div><i>◇</i><span><b>Orijinal ürün</b><small>Yetkili satıcı garantisi</small></span></div>
        <div><i>↗</i><span><b>Aynı gün gönderim</b><small>14.00&apos;e kadar siparişlerde</small></span></div>
        <div><i>↺</i><span><b>Kolay iade</b><small>14 gün içinde</small></span></div>
        <div><i>♙</i><span><b>Uzman desteği</b><small>Ritüel danışmanınız yanında</small></span></div>
      </section>

      <section className="section shell" id="kategoriler">
        <div className="section-head"><div><span className="eyebrow">KENDİ RİTÜELİNİ SEÇ</span><h2>Güzelliğin her hâli</h2></div><a href="#urunler">Tüm kategoriler <span>→</span></a></div>
        <div className="category-grid">{categories.map(([title, copy, cls], i) => <a href="#urunler" className={`category-card cat-${cls}`} key={title}><span className="cat-index">0{i + 1}</span><div className="cat-shape"><i /></div><div><h3>{title}</h3><p>{copy}</p><b>→</b></div></a>)}</div>
      </section>

      <section className="section product-section" id="urunler">
        <div className="shell">
          <div className="section-head products-title"><div><span className="eyebrow">EDİTÖRLERİMİZDEN</span><h2>Şu an sevilenler</h2></div><div className="tabs"><button className="active">Çok satanlar</button><button>Yeni gelenler</button><button>İndirimdekiler</button></div></div>
          <div className="product-grid">{products.slice(0, 4).map(p => <ProductCard key={p.id} product={p} onAdd={() => add(p)} onOpen={() => setActiveProduct(p)} favorite={favorites.includes(p.id)} onFavorite={() => setFavorites(list => list.includes(p.id) ? list.filter(id => id !== p.id) : [...list, p.id])} />)}</div>
          <div className="center"><button className="btn outline">Tüm ürünleri gör <span>↗</span></button></div>
        </div>
      </section>

      <section className="ritual shell" id="rituel">
        <div className="ritual-art"><span className="sun-disc" /><span className="ritual-bottle"><i /></span><span className="spark one">✦</span><span className="spark two">✦</span></div>
        <div className="ritual-copy"><span className="eyebrow">3 DAKİKALIK CİLT ANALİZİ</span><h2>Cildini dinle,<br /><em>doğru ritüeli bul.</em></h2><p>Birkaç soruda cildinin ihtiyaçlarını anlayalım; içerik ve ürün önerilerini sana özel eşleştirelim.</p><ul><li><b>01</b> Cildini anlat</li><li><b>02</b> Hedefini seç</li><li><b>03</b> Ritüelini al</li></ul><button className="btn light" onClick={() => notify("Cilt testi yakında başlıyor")}>Analizi başlat <span>→</span></button></div>
      </section>

      <section className="section shell" id="markalar">
        <div className="section-head"><div><span className="eyebrow">SEÇİLMİŞ MARKALAR</span><h2>İyi formüller, iyi hikâyeler</h2></div><a href="#markalar">Tüm markalar <span>→</span></a></div>
        <div className="brand-wall"><span>ASTER<small>LAB</small></span><span>mori.</span><span>NOA<small>RITUALS</small></span><span>maison lune</span><span>ONDA</span><span>SEREIN</span></div>
      </section>

      <section className="newsletter">
        <div className="shell newsletter-inner"><Brand compact /><div><span className="eyebrow">LUMÉRA LETTERS</span><h2>Işıltılı haberler,<br />sadece sana özel.</h2></div><form onSubmit={e => { e.preventDefault(); notify("Luméra ailesine hoş geldin!"); }}><label htmlFor="email">E-posta adresin</label><div><input id="email" type="email" required placeholder="sen@ornek.com" /><button type="submit">Katıl →</button></div><small>Kaydolarak gizlilik politikamızı kabul edersin.</small></form></div>
      </section>
    </main>

    <footer><div className="shell footer-grid"><div><Brand /><p>İyi formülleri, özgür seçimleri ve sana ait güzellik ritüellerini bir araya getiriyoruz.</p><div className="socials"><a href="#">ig</a><a href="#">tt</a><a href="#">p</a></div></div><div><h4>Keşfet</h4><a href="#urunler">Yeni gelenler</a><a href="#urunler">Çok satanlar</a><a href="#markalar">Markalar</a><a href="#urunler">Kampanyalar</a></div><div><h4>Yardım</h4><a href="#">Sipariş takibi</a><a href="#">Kargo & teslimat</a><a href="#">İade & değişim</a><a href="#">Sık sorulanlar</a></div><div><h4>Luméra</h4><a href="#">Hakkımızda</a><a href="#">İletişim</a><a href="#">KVKK</a><a href="#">Gizlilik</a></div></div><div className="shell footer-bottom"><span>© 2026 Luméra Beauty Store</span><span>Güvenli ödeme · iyzico · PayTR · Visa · Mastercard</span></div></footer>

    <div className={`drawer-backdrop ${cartOpen || activeProduct || searchOpen ? "show" : ""}`} onClick={() => { setCartOpen(false); setActiveProduct(null); setSearchOpen(false); }} />
    <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-hidden={!cartOpen}><div className="drawer-head"><div><span className="eyebrow">SEPETİM</span><h3>{cartCount} ürün</h3></div><button onClick={() => setCartOpen(false)}>×</button></div>{checkout ? <Checkout total={subtotal} onBack={() => setCheckout(false)} notify={notify} /> : <><div className="shipping-progress"><span>{subtotal >= settings.shippingThreshold ? "Kargon bizden!" : `Ücretsiz kargoya ${money(settings.shippingThreshold - subtotal)} kaldı`}</span><i><b style={{ width: `${Math.min(100, subtotal / settings.shippingThreshold * 100)}%` }} /></i></div><div className="cart-lines">{cart.length === 0 ? <div className="empty"><span>◯</span><h4>Sepetin ritüelini bekliyor</h4><p>Seçkide sana göre bir şey mutlaka var.</p><button className="btn dark" onClick={() => setCartOpen(false)}>Alışverişe dön</button></div> : cart.map(line => <div className="cart-line" key={line.id}><ProductArt tone={line.tone} small /><div><small>{line.brand}</small><h4>{line.name}</h4><span>{money(line.price)}</span><div className="qty"><button onClick={() => setCart(lines => lines.map(x => x.id === line.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>−</button>{line.quantity}<button onClick={() => setCart(lines => lines.map(x => x.id === line.id ? { ...x, quantity: x.quantity + 1 } : x))}>+</button></div></div><button className="remove" onClick={() => setCart(lines => lines.filter(x => x.id !== line.id))}>×</button></div>)}</div>{cart.length > 0 && <div className="cart-total"><div><span>Ara toplam</span><strong>{money(subtotal)}</strong></div><small>Vergiler dahil. Kargo sonraki adımda hesaplanır.</small><button className="btn dark wide" onClick={() => setCheckout(true)}>Güvenli ödemeye geç →</button></div>}</>}</aside>

    <aside className={`search-overlay ${searchOpen ? "open" : ""}`} aria-hidden={!searchOpen}><div className="search-top"><Brand compact /><button onClick={() => setSearchOpen(false)}>×</button></div><label><span>⌕</span><input autoFocus={searchOpen} value={query} onChange={e => setQuery(e.target.value)} placeholder="Ara: serum, vegan, kuru cilt…" /></label><p className="search-hint">Popüler: <button onClick={() => setQuery("serum")}>serum</button><button onClick={() => setQuery("güneş")}>güneş</button><button onClick={() => setQuery("Aster")}>Aster Lab</button></p><div className="search-results">{(query ? searchResults : products.slice(0, 4)).map(p => <button key={p.id} onClick={() => { setSearchOpen(false); setActiveProduct(p); }}><ProductArt tone={p.tone} small /><span><small>{p.brand}</small><b>{p.name}</b><em>{money(p.price)}</em></span></button>)}</div></aside>

    {activeProduct && <div className="product-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setActiveProduct(null)}>×</button><div className="modal-art"><ProductArt tone={activeProduct.tone} /></div><div className="modal-copy"><span className="eyebrow">{activeProduct.brand}</span><h2>{activeProduct.name}</h2><span className="rating">★ {activeProduct.rating} · 128 doğrulanmış yorum</span><div className="modal-price"><strong>{money(activeProduct.price)}</strong>{activeProduct.oldPrice && <del>{money(activeProduct.oldPrice)}</del>}</div><p>Hafif dokusu, güçlü aktifleri ve duyuları mutlu eden ritüeliyle günlük bakımına zahmetsizce uyum sağlar.</p><div className="benefits"><span>✓ Dermatolojik testli</span><span>✓ Vegan formül</span><span>✓ Hızlı emilim</span></div><label className="variant">Boyut<select><option>50 ml</option><option>100 ml</option></select></label><button className="btn dark wide" onClick={() => { add(activeProduct); setActiveProduct(null); setCartOpen(true); }}>Sepete ekle · {money(activeProduct.price)}</button><div className="installment">9 aya varan taksit · 3D Secure ile güvenli ödeme</div></div></div>}

    {cookie && <div className="cookie"><span>✦</span><p>Deneyimini kişiselleştirmek için çerez kullanıyoruz. <a href="#">Detaylar</a></p><button onClick={() => setCookie(false)}>Kabul et</button><button className="cookie-close" onClick={() => setCookie(false)}>×</button></div>}
    <nav className="mobile-bottom"><a href="#top">⌂<small>Ana sayfa</small></a><button onClick={() => setSearchOpen(true)}>⌕<small>Ara</small></button><a href="#urunler">◇<small>Keşfet</small></a><button onClick={() => setCartOpen(true)}>◯<small>Sepet ({cartCount})</small></button></nav>
  </div>;
}

function Checkout({ total, onBack, notify }: { total: number; onBack: () => void; notify: (s: string) => void }) {
  return <form className="checkout" onSubmit={e => { e.preventDefault(); notify("Sipariş bilgileri doğrulandı; tahsilat seçili POS üzerinden tamamlanır"); }}><button type="button" className="back" onClick={onBack}>← Sepete dön</button><h3>Tek adımda ödeme</h3><div className="form-row"><label>Ad<input required placeholder="Ad" /></label><label>Soyad<input required placeholder="Soyad" /></label></div><label>E-posta<input required type="email" placeholder="sen@ornek.com" /></label><label>Telefon<input required placeholder="05__ ___ __ __" /></label><label>Adres<textarea required placeholder="Mahalle, sokak, bina ve daire" /></label><div className="form-row"><label>İl<select><option>İstanbul</option><option>Ankara</option><option>İzmir</option></select></label><label>İlçe<input required /></label></div><div className="payment-box"><span>Güvenli kart ödemesi</span><b>iyzico ortak ödeme sayfası</b><small>Kart bilgileriniz Luméra sunucularında tutulmaz.</small></div><label className="check"><input type="checkbox" required /> Mesafeli satış sözleşmesini ve ön bilgilendirme formunu kabul ediyorum.</label><button className="btn dark wide" type="submit">{money(total)} güvenle öde →</button></form>;
}

function AdminPanel({ settings, setSettings, exit, notify }: { settings: typeof initialSettings; setSettings: (s: typeof initialSettings) => void; exit: () => void; notify: (s: string) => void }) {
  const [section, setSection] = useState("Genel Bakış");
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const nav = ["Genel Bakış", "Siparişler", "Ürünler", "Kategoriler", "Stok", "Müşteriler", "Kampanyalar", "Bannerlar", "İçerik Sayfaları", "Tedarikçiler", "Raporlar", "Sanal POS", "Mağaza Ayarları"];
  const save = async () => {
    setSaving(true);
    setSettings(draft);
    localStorage.setItem("lumera-settings-preview", JSON.stringify(draft));
    try { await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }); } catch { /* Yerel önizleme çevrimdışı devam eder. */ }
    setTimeout(() => { setSaving(false); notify("Ayarlar kaydedildi ve mağaza önizlemesine uygulandı"); }, 450);
  };
  return <div className="admin">
    <aside className="admin-sidebar"><div className="admin-brand"><Brand compact /><span>YÖNETİM</span></div><nav>{nav.map(item => <button className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}><i>{item === "Genel Bakış" ? "⌁" : item === "Sanal POS" ? "▣" : "◇"}</i>{item}<b>›</b></button>)}</nav><div className="admin-user"><span>LA</span><div><b>Luméra Admin</b><small>Süper yönetici</small></div><button onClick={exit}>↗</button></div></aside>
    <main className="admin-main"><header><div><span className="eyebrow">LUMÉRA CONTROL ROOM</span><h1>{section}</h1></div><div><button className="preview-btn" onClick={exit}>Mağazayı görüntüle ↗</button><button className="admin-bell">♢<b>3</b></button></div></header>
      {section === "Genel Bakış" && <Dashboard setSection={setSection} />}
      {section === "Sanal POS" && <PosSettings draft={draft} setDraft={setDraft} save={save} saving={saving} />}
      {section === "Mağaza Ayarları" && <StoreSettings draft={draft} setDraft={setDraft} save={save} saving={saving} />}
      {!['Genel Bakış','Sanal POS','Mağaza Ayarları'].includes(section) && <ManagementTable section={section} notify={notify} />}
    </main>
  </div>;
}

function Dashboard({ setSection }: { setSection: (s: string) => void }) {
  return <><section className="admin-welcome"><div><span>Günaydın, Luméra ✦</span><h2>Ritüeller büyüyor.</h2><p>Bugün dünden %18 daha güçlü başladın.</p></div><div className="date-chip">18 — 24 Temmuz 2026</div></section><div className="metric-grid"><div><span>Bugünkü ciro</span><b>₺48.720</b><small className="up">↗ %18,4</small><i className="mini-chart c1" /></div><div><span>Sipariş</span><b>126</b><small className="up">↗ %12,1</small><i className="mini-chart c2" /></div><div><span>Ort. sepet</span><b>₺387</b><small className="up">↗ %5,7</small><i className="mini-chart c3" /></div><div><span>Dönüşüm</span><b>%2,84</b><small className="down">↘ %0,3</small><i className="mini-chart c4" /></div></div><div className="admin-panels"><section className="sales-panel"><div className="panel-head"><div><span>Satış performansı</span><b>₺284.650 <small>bu hafta</small></b></div><select><option>Son 7 gün</option></select></div><div className="chart"><div className="chart-lines"><i /><i /><i /><i /></div><span className="curve" /><div className="chart-labels"><span>Pzt</span><span>Sal</span><span>Çar</span><span>Per</span><span>Cum</span><span>Cmt</span><span>Paz</span></div></div></section><section className="todo-panel"><div className="panel-head"><div><span>Bekleyen işler</span><b>12 aksiyon</b></div><button>↗</button></div><button><i className="orange">8</i><span><b>Hazırlanacak sipariş</b><small>Bugün kargoya çıkmalı</small></span><em>›</em></button><button><i className="pink">3</i><span><b>Onay bekleyen yorum</b><small>Fotoğraflı değerlendirmeler</small></span><em>›</em></button><button><i className="purple">5</i><span><b>Kritik stok</b><small>Eşik altındaki ürünler</small></span><em>›</em></button><button onClick={() => setSection("Sanal POS")}><i className="green">✓</i><span><b>POS bağlantısı</b><small>Test modu etkin</small></span><em>›</em></button></section></div><section className="recent-orders"><div className="panel-head"><div><span>Son siparişler</span><b>Canlı akış <small className="live">●</small></b></div><button>Tümünü gör →</button></div><table><thead><tr><th>Sipariş</th><th>Müşteri</th><th>Ürün</th><th>Tutar</th><th>Ödeme</th><th>Durum</th></tr></thead><tbody>{[["#LM-1048","Melis A.","3 ürün","₺1.284","Kart","Hazırlanıyor"],["#LM-1047","Deniz K.","1 ürün","₺729","Kart","Ödendi"],["#LM-1046","Seda T.","2 ürün","₺1.039","Havale","Bekliyor"],["#LM-1045","Ece Y.","4 ürün","₺2.114","Kart","Kargoda"]].map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={cell}>{i === 5 ? <span className={`status s${row[5]}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></section></>;
}

function PosSettings({ draft, setDraft, save, saving }: { draft: typeof initialSettings; setDraft: (s: typeof initialSettings) => void; save: () => void; saving: boolean }) {
  const update = (key: keyof typeof initialSettings, value: unknown) => setDraft({ ...draft, [key]: value });
  return <div className="settings-layout"><section className="settings-main"><div className="settings-card"><div className="settings-title"><div><span>Ödeme sağlayıcısı</span><p>Canlı mağazada kullanılacak sanal POS altyapısını seçin.</p></div><span className={`mode ${draft.testMode ? "test" : "live"}`}>{draft.testMode ? "TEST MODU" : "CANLI"}</span></div><div className="provider-grid"><button className={draft.provider === "iyzico" ? "active" : ""} onClick={() => update("provider", "iyzico")}><b>iyzico</b><small>Ortak ödeme sayfası · TR</small><i>{draft.provider === "iyzico" ? "✓" : ""}</i></button><button className={draft.provider === "paytr" ? "active" : ""} onClick={() => update("provider", "paytr")}><b>PayTR</b><small>iFrame API · TR</small><i>{draft.provider === "paytr" ? "✓" : ""}</i></button></div><div className="secret-note"><i>⌁</i><div><b>API anahtarları güvenli ortam değişkenlerinde tutulur</b><p>Gizli bilgiler tarayıcıya veya GitHub deposuna yazılmaz. <code>{draft.provider === "iyzico" ? "IYZICO_API_KEY · IYZICO_SECRET_KEY" : "PAYTR_MERCHANT_ID · PAYTR_MERCHANT_KEY · PAYTR_MERCHANT_SALT"}</code></p></div></div></div><div className="settings-card"><div className="settings-title"><div><span>Güvenlik ve mod</span><p>Ödeme akışının temel güvenlik kuralları.</p></div></div><Toggle label="3D Secure zorunlu" copy="Tüm kart işlemlerinde banka doğrulaması ister." value={draft.threeDSecure} onChange={v => update("threeDSecure", v)} /><Toggle label="Test modu" copy="Gerçek tahsilat yapmadan entegrasyonu sınar." value={draft.testMode} onChange={v => update("testMode", v)} /></div><div className="settings-card"><div className="settings-title"><div><span>Taksit seçenekleri</span><p>Müşteriye gösterilecek vade seçeneklerini belirleyin.</p></div></div><div className="installment-grid">{[2,3,6,9,12].map(n => <label key={n}><input type="checkbox" checked={draft.installments.includes(n)} onChange={() => update("installments", draft.installments.includes(n) ? draft.installments.filter(x => x !== n) : [...draft.installments, n])} /><span>{n} taksit</span></label>)}</div></div><div className="settings-card"><div className="settings-title"><div><span>Alternatif ödeme</span><p>Kart dışı yöntemleri yönetin.</p></div></div><Toggle label="Havale / EFT" copy="Sipariş sonrası banka bilgilerini gösterir." value={draft.bankTransfer} onChange={v => update("bankTransfer", v)} /><Toggle label="Kapıda ödeme" copy="Dropshipping operasyonlarında dikkatle kullanılması önerilir." value={draft.cashOnDelivery} onChange={v => update("cashOnDelivery", v)} /></div></section><aside className="settings-side"><div className="health-card"><span>Entegrasyon durumu</span><div className="health-ring"><b>92</b><small>/100</small></div><h3>Yayına hazır</h3><p>Canlı moda geçmeden önce gerçek kartla uçtan uca test siparişi yapın.</p><ul><li><b>✓</b> Sağlayıcı seçildi</li><li><b>✓</b> 3D Secure açık</li><li><b>✓</b> Webhook rotası hazır</li><li className="warn"><b>!</b> Canlı anahtar bekleniyor</li></ul></div><div className="flow-card"><span>Ödeme akışı</span><ol><li><b>1</b>Müşteri checkout</li><li><b>2</b>Sağlayıcı güvenli sayfası</li><li><b>3</b>3D Secure onayı</li><li><b>4</b>Webhook ile sipariş onayı</li></ol></div></aside><div className="save-bar"><div><b>Değişiklikleri kaydet</b><span>Önizleme anında güncellenir; gizli anahtarlar yalnızca sunucuda kalır.</span></div><button className="btn dark" onClick={save} disabled={saving}>{saving ? "Kaydediliyor…" : "Ayarları kaydet →"}</button></div></div>;
}

function Toggle({ label, copy, value, onChange }: { label: string; copy: string; value: boolean; onChange: (v: boolean) => void }) { return <div className="toggle-row"><div><b>{label}</b><span>{copy}</span></div><button className={value ? "on" : ""} onClick={() => onChange(!value)} aria-pressed={value}><i /></button></div>; }

function StoreSettings({ draft, setDraft, save, saving }: { draft: typeof initialSettings; setDraft: (s: typeof initialSettings) => void; save: () => void; saving: boolean }) {
  return <div className="store-settings"><section className="settings-card"><div className="settings-title"><div><span>Vitrin metinleri</span><p>Ana sayfanın ilk ekranını ve duyuru bandını düzenleyin.</p></div></div><label>Duyuru bandı<input value={draft.announcement} onChange={e => setDraft({ ...draft, announcement: e.target.value })} /></label><label>Üst başlık<input value={draft.heroEyebrow} onChange={e => setDraft({ ...draft, heroEyebrow: e.target.value })} /></label><label>Ana başlık<textarea value={draft.heroTitle} onChange={e => setDraft({ ...draft, heroTitle: e.target.value })} /></label><label>Açıklama<textarea value={draft.heroCopy} onChange={e => setDraft({ ...draft, heroCopy: e.target.value })} /></label></section><section className="settings-card"><div className="settings-title"><div><span>Ticari kurallar</span><p>Kargo ve sadakat programı varsayılanları.</p></div></div><div className="form-row"><label>Ücretsiz kargo eşiği<input type="number" value={draft.shippingThreshold} onChange={e => setDraft({ ...draft, shippingThreshold: Number(e.target.value) })} /></label><label>Puan kazanım oranı (%)<input type="number" value={draft.loyaltyRate} onChange={e => setDraft({ ...draft, loyaltyRate: Number(e.target.value) })} /></label></div></section><button className="btn dark" onClick={save} disabled={saving}>{saving ? "Kaydediliyor…" : "Mağazaya uygula →"}</button></div>;
}

function ManagementTable({ section, notify }: { section: string; notify: (s: string) => void }) {
  return <section className="management"><div className="management-toolbar"><div className="admin-search">⌕ <input placeholder={`${section} içinde ara…`} /></div><button>Filtrele</button><button>İçe aktar</button><button className="btn dark" onClick={() => notify(`Yeni ${section.toLocaleLowerCase("tr")} kaydı taslağı açıldı`)}>+ Yeni ekle</button></div><div className="management-card"><div className="empty-visual"><span>◇</span><i>✦</i></div><h2>{section} yönetimi hazır</h2><p>Listeleme, arama, filtreleme, toplu işlem ve düzenleme akışları bu modülde yönetilir. Gerçek veriler D1 veritabanından gelir.</p><div className="module-chips"><span>Rol bazlı yetki</span><span>Toplu işlemler</span><span>CSV / Excel</span><span>Denetim kaydı</span></div><button className="btn outline" onClick={() => notify(`${section} için örnek veri oluşturuldu`)}>Örnek kayıt oluştur</button></div></section>;
}

export function LumeraApp() {
  const [admin, setAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [toast, setToast] = useState("");
  useEffect(() => { const saved = localStorage.getItem("lumera-settings-preview"); if (saved) setSettings({ ...initialSettings, ...JSON.parse(saved) }); }, []);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  return <>{admin ? <AdminPanel settings={settings} setSettings={setSettings} exit={() => setAdmin(false)} notify={notify} /> : <Storefront settings={settings} setAdmin={() => setLoginOpen(true)} notify={notify} />}{loginOpen && <AdminLogin onClose={() => setLoginOpen(false)} onSuccess={() => { setLoginOpen(false); setAdmin(true); }} />}<div className={`toast ${toast ? "show" : ""}`}>✓ {toast}</div></>;
}

function AdminLogin({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return <div className="admin-login-overlay" role="dialog" aria-modal="true" aria-label="Yönetici girişi"><button className="admin-login-close" onClick={onClose}>×</button><form className="admin-login-card" onSubmit={e => { e.preventDefault(); if (username === "admin" && password === "12345") onSuccess(); else setError("Kullanıcı adı veya şifre hatalı"); }}><Brand compact /><span className="eyebrow">CONTROL ROOM</span><h1>Yönetici girişi</h1><p>Mağaza yönetimine devam etmek için bilgilerinizi girin.</p><label>Kullanıcı adı<input autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required /></label><label>Şifre<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <small className="login-error">{error}</small>}<button className="btn dark wide" type="submit">Giriş yap →</button></form></div>;
}
