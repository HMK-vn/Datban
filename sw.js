/* 16/11/2026: service worker trang khách Túi Nướng — chỉ để nhận THÔNG BÁO ĐƠN ĐẶT BÀN (web push).
   Nguồn ở tools/ (không đặt trong datban vì clasp sẽ đẩy .js lên Apps Script); build_static.js ghi ra sw.js, thay https://script.google.com/macros/s/AKfycbxzF35ugPCL5jDZrmZzOSx4-ZsoEZimxM6lDKn4zYcajHimG_K1250pip16IEqsDHqQQg/exec.
   Push gửi payload rỗng -> SW tự hỏi máy chủ layThongBaoPush(endpoint) để lấy nội dung. Không cache gì. */
var API = "https://script.google.com/macros/s/AKfycbxzF35ugPCL5jDZrmZzOSx4-ZsoEZimxM6lDKn4zYcajHimG_K1250pip16IEqsDHqQQg/exec";
var TIN_MAC_DINH = { title: "Túi Nướng Lavender", body: "Đơn đặt bàn có cập nhật mới — bấm để xem", url: "tracuu.html" };
var ICON = "app_icon/logo_khach_180.png";
var BADGE = "app_icon/be_cho_64.png";

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

self.addEventListener("push", function (event) {
  event.waitUntil(layTin().then(function (tin) {
    tin = tin || TIN_MAC_DINH;
    return self.registration.showNotification(String(tin.title || TIN_MAC_DINH.title), {
      body: String(tin.body || ""),
      icon: ICON,
      lang: "vi",
      data: { url: String(tin.url || TIN_MAC_DINH.url) }
    });
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var duong = (event.notification.data && event.notification.data.url) || TIN_MAC_DINH.url;
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
