/* 16/11/2026: service worker trang khách Túi Nướng — chỉ để nhận THÔNG BÁO ĐƠN ĐẶT BÀN (web push).
   Nguồn ở tools/ (không đặt trong datban vì clasp sẽ đẩy .js lên Apps Script); build_static.js ghi ra sw.js, thay https://script.google.com/macros/s/AKfycbxzF35ugPCL5jDZrmZzOSx4-ZsoEZimxM6lDKn4zYcajHimG_K1250pip16IEqsDHqQQg/exec.
   Push gửi payload rỗng -> SW tự hỏi máy chủ layThongBaoPush(endpoint) để lấy nội dung. Không cache gì. */
var API = "https://script.google.com/macros/s/AKfycbxzF35ugPCL5jDZrmZzOSx4-ZsoEZimxM6lDKn4zYcajHimG_K1250pip16IEqsDHqQQg/exec";
var TIN_MAC_DINH = { title: "Túi Nướng Lavender", body: "Đơn đặt bàn có cập nhật mới — bấm để xem", url: "tracuu.html" };
var ICON = "app_icon/logo_khach_180.png";

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) { event.waitUntil(self.clients.claim()); });

function layTin() {
  var hetGio = new Promise(function (ok) { setTimeout(function () { ok(null); }, 20000); });
  var hoi = self.registration.pushManager.getSubscription().then(function (sub) {
    if (!sub) return null;
    return fetch(API, {
      method: "POST", redirect: "follow", credentials: "omit", cache: "no-store",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ fn: "layThongBaoPush", args: [sub.endpoint] })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (res) { return res && res.ok && res.result && res.result.title ? res.result : null; });
  }).catch(function () { return null; });
  return Promise.race([hoi, hetGio]);
}

// 17/11/2026: tin có tag (máy quản trị: "banmoi" / "hoancoc") -> gộp thành 1 thông báo cho mỗi nhóm,
// tiêu đề kèm số tin, nội dung liệt kê tối đa 5 tin mới nhất; tin không tag (khách) hiện riêng như cũ.
var TEN_NHOM = { banmoi: "Bàn mới", hoancoc: "Hoàn cọc" };
var ICON_QT = "app_icon/logo_admin_180.png";
// 17/11/2026: icon riêng từng nhóm (vẽ cùng bộ icon của trang) + badge trắng nền trong cho thanh trạng thái Android
var ICON_NHOM = { banmoi: "app_icon/tb_banmoi.png", hoancoc: "app_icon/tb_hoancoc.png" };
var BADGE_QT = "app_icon/tb_badge.png";
self.addEventListener("push", function (event) {
  event.waitUntil(layTin().then(function (tin) {
    tin = tin || TIN_MAC_DINH;
    var tag = tin.tag ? String(tin.tag) : "";
    if (!tag) return self.registration.showNotification(String(tin.title || TIN_MAC_DINH.title), {
      body: String(tin.body || ""), icon: ICON, badge: BADGE_QT, lang: "vi", data: { url: String(tin.url || TIN_MAC_DINH.url) }
    });
    return self.registration.getNotifications({ tag: tag }).then(function (cu) {
      var ds = (cu[0] && cu[0].data && cu[0].data.ds) || [];
      ds = [String(tin.body || tin.title)].concat(ds).slice(0, 20);
      cu.forEach(function (n) { n.close(); });
      var ten = TEN_NHOM[tag] || String(tin.title);
      return self.registration.showNotification(ds.length > 1 ? ten + " (" + ds.length + ")" : String(tin.title || ten), {
        body: ds.slice(0, 5).join("\n") + (ds.length > 5 ? "\n… và " + (ds.length - 5) + " tin nữa" : ""),
        icon: ICON_NHOM[tag] || ICON_QT, badge: BADGE_QT, lang: "vi", tag: tag, renotify: true, image: tin.image ? String(tin.image) : undefined, // 17/11/2026: ảnh bill CK / QR
        data: { url: String(tin.url || "admin.html"), ds: ds, qt: true }
      });
    });
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var duong = (event.notification.data && event.notification.data.url) || TIN_MAC_DINH.url;
  // 17/11/2026: thông báo quản trị -> mở lại trang quản trị đang mở (giữ ?key=), hoặc link quản trị đã nhớ
  if (event.notification.data && event.notification.data.qt) {
    event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (ds) {
      for (var i = 0; i < ds.length; i++) if (/admin\.html/.test(ds[i].url) && "focus" in ds[i]) return ds[i].focus();
      return caches.open("tn-quantri").then(function (c) { return c.match("link-quantri"); })
        .then(function (r) { return r ? r.text() : "admin.html"; })
        .then(function (u) { if (self.clients.openWindow) return self.clients.openWindow(u); });
    }));
    return;
  }
  var dich;
  try { dich = new URL(duong, self.registration.scope); } catch (e) { dich = new URL(TIN_MAC_DINH.url, self.registration.scope); }
  // Chỉ mở trang cùng nguồn với trang khách
  if (dich.origin !== self.location.origin) dich = new URL(TIN_MAC_DINH.url, self.registration.scope);
  var url = dich.href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (ds) {
    for (var i = 0; i < ds.length; i++) {
      if (ds[i].url === url && "focus" in ds[i]) return ds[i].focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
