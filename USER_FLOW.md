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
    S --> S1[Quét máy trên thiết bị được hỗ trợ]
    S --> S2[Phân loại ứng dụng: Đỏ / Vàng / Xanh]
    S2 --> M
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
    X --> X1[Xem cây và lựa chọn mua<br/>Có thể nâng cấp VIP]
    X1 --> X2{Đủ Xu hoặc có quyền VIP?}
    X2 -- Có --> X3[Mua hoặc mở khóa cây]
    X2 -- Chưa --> X4[Quay lại tích lũy Xu / xem VIP]
    X3 --> W
    X4 --> U
    U -->|Tài khoản| Y[Tài khoản]
    Y --> Y1[Hồ sơ cá nhân]
    Y --> Y2[Mục tiêu học tập]
    Y --> Y3[Cài đặt thông báo]
    Y --> Y4[Thiết bị IoT<br/>quét USB trên Android]
    Y --> Y5[Dữ liệu demo<br/>chỉ tài khoản quản trị]
    Y --> Y6[Đăng xuất]
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
