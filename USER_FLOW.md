# User flow — Focust

Sơ đồ mô tả luồng người dùng chính theo các màn hình và chức năng hiện có trong ứng dụng.

```mermaid
flowchart TD
    A([Mở Focust]) --> B{Đã có phiên đăng nhập?}
    B -- Có --> C[Đồng bộ dữ liệu]
    B -- Chưa --> D[Màn hình đăng nhập]
    D -->|Nhập tên đăng nhập và mật khẩu| E{Đăng nhập thành công?}
    E -- Không --> D
    E -- Có --> C
    D -->|Chưa có tài khoản| F[Đăng ký<br/>Tên, username, email, mật khẩu]
    F --> G{Thông tin hợp lệ?}
    G -- Không --> F
    G -- Có --> C
    D -->|Quên mật khẩu| H[Nhập email và yêu cầu liên kết đặt lại]
    H --> D
    D -->|Quay lại đăng nhập| D

    C --> I[Home]
    I --> J[Chọn hoặc tạo task học tập]
    J --> K[Chọn thời lượng<br/>25 phút / 45 phút / 1 giờ / tùy chỉnh]
    K --> L[Chọn cây đang sở hữu]
    L --> M[Bắt đầu phiên tập trung]
    M --> N{Phiên đã hoàn thành?}
    N -- Chưa --> M
    N -- Hoàn thành --> O[Lưu phiên, cập nhật tiến độ và streak]
    O --> P{Đủ điều kiện nhận Xu?}
    P -- Có --> Q[Cộng Xu và cập nhật ví]
    P -- Chưa --> R[Lưu phiên, không cộng Xu]
    Q --> I
    R --> I

    I --> S[Quản lý Vùng tập trung]
    S --> S1[Quét máy]
    S1 --> S2{Nền tảng hỗ trợ quét?}
    S2 -- Có --> S3[Đồng bộ danh sách ứng dụng]
    S2 -- Không --> S4[Hiện ghi chú giới hạn nền tảng]
    S3 --> S5[Chọn ứng dụng và nhóm màu]
    S5 --> S6[Lưu nhóm ứng dụng]
    S6 --> S7{Ứng dụng thuộc nhóm nào?}
    S7 -- Đỏ --> S8[Cảnh báo khi mở<br/>Nếu bấm trong giao diện, timer dừng và reset]
    S7 -- Vàng --> S9[Hiện lời nhắc<br/>Timer không reset]
    S7 -- Xanh --> S10[Được phép, không hiện cảnh báo]
    S8 --> I
    S9 --> I
    S10 --> I
    S6 --> S11{Nền tảng}
    S11 -- Android --> S12[Cấp Usage access và thông báo<br/>Theo dõi app Đỏ/Vàng trong phiên]
    S12 --> M
    S11 -- iOS --> S13[Tự tạo Shortcut cho từng app Đỏ/Vàng]
    S13 --> S14[Automation hiện nhắc khi mở app<br/>Không biết timer có đang chạy]
    S11 -- Trình duyệt --> S15[Không quét app đã cài<br/>hoặc theo dõi app bên ngoài]
    I --> T[Thông báo]
    T --> T1[Xem thông báo]
    T1 --> T2[Đánh dấu đã đọc / đọc tất cả]
    T2 --> I

    I --> U{Chọn mục ở thanh điều hướng}
    U -->|Home| I
    U -->|Xếp hạng| V[Bảng xếp hạng Top 100]
    V --> U
    U -->|Index| W[Khu vườn]
    W --> W1[Xem cây đã sở hữu<br/>Lọc và yêu thích cây]
    W1 --> U
    U -->|Shop| X[Cửa hàng]
    X --> X0[Nhận 200 Xu mỗi ngày<br/>nếu chưa nhận]
    X0 --> X1[Chọn tab Bằng Xu hoặc Đặc biệt VIP]
    X1 --> X2{Chọn loại cây}
    X2 -- Cây thường --> X3{Đủ Xu?}
    X3 -- Có --> X4[Mua cây<br/>Cập nhật ví và thông báo]
    X3 -- Không --> X5[Hiện lỗi mua<br/>Tích lũy Xu rồi thử lại]
    X4 --> W
    X5 --> X1
    X2 -- Cây VIP --> X6{Tài khoản đã có VIP?}
    X6 -- Có --> X7[Mở cây VIP]
    X6 -- Chưa --> X8[Xem thông tin gói VIP]
    X7 --> W
    X8 --> X9[CTA nâng cấp hiện chưa kết nối thanh toán]
    X9 --> X1
    X0 --> U
    U -->|Tài khoản| Y[Tài khoản]
    Y --> Y1[Hồ sơ cá nhân]
    Y --> Y2[Mục tiêu học tập]
    Y --> Y3[Cài đặt thông báo]
    Y --> Y4[Thiết bị IoT<br/>quét USB trên Android]
    Y --> Y5[Dữ liệu demo<br/>chỉ tài khoản quản trị]
    Y --> Y6[Đăng xuất]
    Y --> Y7[Nâng cấp VIP<br/>xem thông tin gói]
    Y1 --> Y
    Y2 --> Y
    Y3 --> Y
    Y4 --> Y
    Y5 --> Y
    Y6 --> D
```

## Luồng cốt lõi

1. Người dùng đăng nhập hoặc tạo tài khoản; nếu quên mật khẩu, yêu cầu gửi hướng dẫn qua email.
2. Tại **Home**, chọn/tạo task, đặt thời lượng, chọn cây sở hữu rồi bắt đầu phiên tập trung.
3. Khi phiên hoàn thành, ứng dụng lưu tiến độ và streak; phiên đủ điều kiện sẽ được cộng Xu.
4. Xu có thể dùng trong **Cửa hàng** để mở khóa cây; cây đã sở hữu xuất hiện trong **Khu vườn** và có thể chọn cho phiên sau.
5. Người dùng có thể theo dõi **Xếp hạng**, xem **Thông báo**, và chỉnh hồ sơ, mục tiêu, cài đặt trong **Tài khoản**.

## Ghi chú phạm vi

- Đăng nhập dùng tên đăng nhập và mật khẩu; đăng ký yêu cầu tên, username, email, mật khẩu và xác nhận mật khẩu.
- Quét danh sách ứng dụng chỉ khả dụng trên nền tảng native được hỗ trợ; nhắc ứng dụng trong phiên phụ thuộc quyền thiết bị.
- Quét thiết bị USB/OTG hiện hỗ trợ Android native; trình duyệt và iOS chưa hỗ trợ.
- Dữ liệu demo chỉ hiển thị với tài khoản quản trị đã được cấu hình.

## Chi tiết phân loại ứng dụng

| Nhóm | Hành vi trong ứng dụng |
| --- | --- |
| **Đỏ** | Cảnh báo khi mở. Nếu người dùng bấm biểu tượng app Đỏ trong giao diện Home, phiên đang chạy dừng và bộ đếm trở về thời lượng đã chọn. |
| **Vàng** | Hiện lời nhắc khi mở; lời nhắc không reset bộ đếm. |
| **Xanh** | Cho phép sử dụng, không hiện cảnh báo Đỏ/Vàng. |

Người dùng vào **Home → Vùng tập trung → Tùy chỉnh**, chọn ứng dụng, chọn một trong ba nhóm rồi lưu. Có thể quét máy để cập nhật danh sách khi nền tảng hỗ trợ.

- **Android native:** theo dõi ứng dụng Đỏ/Vàng trong phiên cần quyền Usage access và thông báo. Dịch vụ chỉ chạy trong phiên tập trung và dừng khi tạm dừng hoặc kết thúc; ứng dụng không bị chặn.
- **iOS:** cần tự tạo Shortcut automation cho từng ứng dụng Đỏ/Vàng. Shortcut nhắc mỗi khi mở ứng dụng và không biết phiên tập trung có đang chạy hay không.
- **Trình duyệt:** không thể quét danh sách ứng dụng đã cài hoặc theo dõi ứng dụng bên ngoài.

## Luồng Cửa hàng và Khu vườn

- Có thể nhận 200 Xu điểm danh mỗi ngày nếu chưa nhận trong ngày.
- Cửa hàng có tab **Bằng Xu** và **Đặc biệt VIP**. Mua cây thường bằng Xu; nếu giao dịch thất bại, ứng dụng hiển thị lỗi. Cây mua thành công được thêm vào ví và Khu vườn.
- Cây VIP được mở khi tài khoản có VIP. Nút nâng cấp hiện mở thông tin gói VIP; luồng thanh toán chưa được kết nối.
- Khu vườn hỗ trợ lọc tất cả cây, cây hiếm, cây yêu thích và bật/tắt yêu thích. Cây đã sở hữu có thể chọn trong phiên tập trung.
