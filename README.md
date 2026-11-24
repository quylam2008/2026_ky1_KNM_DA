# Focust — React, Vite và Capacitor

Bản ứng dụng native dùng chung Supabase với bản Next.js chính. Đăng ký, đăng
nhập, nhiệm vụ, nhóm ứng dụng, phiên tập trung và Top 100 đều được đồng bộ qua
Supabase.

## Chạy giao diện web

```bash
pnpm install
pnpm dev
```

Tạo file `.env` từ `.env.example` và điền Supabase Project URL cùng Publishable
key. Không đưa `.env` hoặc `SUPABASE_SERVICE_ROLE_KEY` lên GitHub; đặt secret
của Edge Function trong Supabase Dashboard.

Trình duyệt không được phép đọc danh sách ứng dụng đã cài. Nút **Quét máy** chỉ
hoạt động trong bản Capacitor.

## Host bản web trên GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` tự build và deploy khi có commit
mới lên `main`. Trong GitHub, mở **Settings → Pages** và đặt **Build and
deployment → Source** thành **GitHub Actions**.

Vì ứng dụng web cần kết nối Supabase, hãy thêm hai repository variables tại
**Settings → Secrets and variables → Actions → Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key (hoặc anon key) của
  ứng dụng; đây là khóa client công khai, không phải service-role key.

Không thêm `SUPABASE_SERVICE_ROLE_KEY` vào bản web hoặc GitHub Pages. Sau khi
workflow chạy thành công, trang sẽ có địa chỉ
`https://quylam2008.github.io/2026_ky1_KNM_DA/`. GitHub Pages chỉ host bản web;
nó không cài app native lên thiết bị.

Để mở bản web như ứng dụng trên iPhone, mở địa chỉ trên bằng Safari, chọn
**Chia sẻ → Thêm vào màn hình chính**, rồi mở Focust từ biểu tượng vừa thêm.
Manifest PWA giúp trang chạy độc lập, không có thanh địa chỉ Safari. Mở link
trực tiếp trong Chrome vẫn là một trang web trong Chrome.

## Cửa hàng và phần thưởng

Trước khi cập nhật Edge Function, chạy các migration trong
`supabase/migrations/` theo thứ tự thời gian trong Supabase SQL Editor. Sau đó
cập nhật function `make-server-23149b0b` bằng hai tệp trong
`supabase/functions/make-server-23149b0b/`.

Số dư, cây đã mua và yêu thích, lượt nhận thưởng hằng ngày, mục tiêu, tùy chọn
thông báo và hộp thư thông báo trong ứng dụng được lưu trong Supabase. Hồ sơ,
mục tiêu học tập và tùy chọn thông báo có thể chỉnh sửa ở trang Tài khoản. Sau
khi thay đổi backend, hãy chạy migration cần thiết và cập nhật Edge Function
như hướng dẫn ở trên trước khi dùng các chức năng này.

Task được lưu theo ID trong KV store, hỗ trợ trùng tên với thời lượng khác
nhau và chỉnh sửa. Phiên hoàn thành lưu task và cây đã chọn; bộ chọn cây chỉ
hiển thị cây người dùng sở hữu trong Khu vườn.

Cây yêu thích được lưu trong KV store của Edge Function, không cần migration
mới. Cần deploy Edge Function sau khi cập nhật mã nguồn để đồng bộ danh sách.
Biểu đồ tiến độ trang Home lấy tổng phút tập trung theo ngày trong 7 ngày gần
nhất; lịch sử ngày được giữ tối đa 365 ngày trong KV store.

Streak tăng một lần cho mỗi ngày có phiên tập trung được lưu, theo múi giờ
Việt Nam; bỏ lỡ một ngày sẽ bắt đầu lại từ 1. Lịch sử streak được lưu cùng hồ
sơ người dùng trong KV store của Edge Function.

Thông báo hiện được lưu để xem trong ứng dụng và có thể đánh dấu đã đọc. Push
notification khi ứng dụng đóng cần cấu hình thêm dịch vụ gửi thông báo cho Web,
Android và iOS. Tích hợp thiết bị IoT thật cũng cần thông tin model và giao thức
kết nối của thiết bị.

## Build và đồng bộ native

Tạo `.env` từ `.env.example`, cài dependencies, rồi build web assets cho app:

```bash
pnpm install
pnpm build
pnpm exec cap sync
```

Mở dự án native:

```bash
pnpm exec cap open android
pnpm exec cap open ios
```

### Android

Cài Android Studio và Android SDK, mở dự án bằng `pnpm exec cap open android`,
rồi chạy trên emulator hoặc điện thoại Android đã bật USB debugging. Có thể chạy
trực tiếp bằng CLI sau khi đã cài/khởi động thiết bị:

```bash
pnpm exec cap run android
```

Trong **Vùng tập trung**, bật quyền **Usage access** và thông báo cho Focust.
Khi bắt đầu phiên, Focust dùng foreground service có thông báo thường trực để
nhận biết ứng dụng thuộc nhóm Đỏ/Vàng và nhắc; dịch vụ tự dừng khi hết thời gian
hoặc khi tạm dừng phiên. Tính năng chỉ nhắc, không chặn ứng dụng.

Plugin `InstalledAppsPlugin` dùng `PackageManager` để đọc các ứng dụng có
launcher mà Android cho phép hiển thị. Cấu hình `<queries>` nằm trong
`android/app/src/main/AndroidManifest.xml`.

### iOS

iOS cần máy macOS có cài Xcode. Mở dự án bằng `pnpm exec cap open ios`, chọn
Simulator hoặc iPhone đã được cấu hình signing trong Xcode, rồi nhấn **Run**.
Để cập nhật native app sau khi sửa web code, chạy `pnpm build` và
`pnpm exec cap sync` trước khi build/run lại. Không thể build iOS native trên
Windows.

iOS không cung cấp API liệt kê toàn bộ ứng dụng đã cài. Plugin chỉ dùng
`canOpenURL` để kiểm tra danh mục URL scheme được khai báo trong
`ios/App/App/Info.plist`. Muốn hỗ trợ thêm ứng dụng, thêm cả scheme và tên hiển
thị vào hai vị trí đó trước khi gửi App Store.

Để tự nhắc khi mở app Đỏ/Vàng, trong ứng dụng **Phím tắt** tạo automation riêng
cho từng app: **Tự động hóa → Ứng dụng → Được mở → Chạy ngay → Hiển thị thông
báo**. iOS không cho Focust biết automation nào đã cấu hình hoặc phiên tập trung
có đang chạy không; Shortcut tự hiện thông báo mỗi khi app đó được mở và không
chặn app.
