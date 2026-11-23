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

```bash
pnpm build
pnpm exec cap sync
```

Mở dự án native:

```bash
pnpm exec cap open android
pnpm exec cap open ios
```

### Android

Plugin `InstalledAppsPlugin` dùng `PackageManager` để đọc các ứng dụng có
launcher mà Android cho phép hiển thị. Cấu hình `<queries>` nằm trong
`android/app/src/main/AndroidManifest.xml`.

### iOS

iOS không cung cấp API liệt kê toàn bộ ứng dụng đã cài. Plugin chỉ dùng
`canOpenURL` để kiểm tra danh mục URL scheme được khai báo trong
`ios/App/App/Info.plist`. Muốn hỗ trợ thêm ứng dụng, thêm cả scheme và tên hiển
thị vào hai vị trí đó trước khi gửi App Store.
