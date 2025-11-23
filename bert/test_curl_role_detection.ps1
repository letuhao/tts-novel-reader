# Test Role Detection API với đoạn văn mẫu
# Test Role Detection API with sample text

$body = @{
    paragraphs = @(
        "[ sự kiện: [ tử vong (cực nóng)], dâm ngược đếm <+3000 điểm >. Trước mặt dâm ngược đếm <15274 điểm >]",
        "[ hệ thống: Kí chủ tử vong, xuyên qua cảnh tượng kết thúc. Cảnh tượng nội thu hoạch dâm ngược đếm: <15274 điểm >]",
        "[ cảnh tượng kết thúc: Đếm đánh giá <S>, tình tiết đánh giá <A>, ngoài định mức đánh giá < vô >. Đánh giá chung giá trị: <S>]",
        "[ đánh giá chung giá trị S: Cảnh tượng dâm ngược < cấp độ A >→< cấp độ C >, kí chủ mẫn cảm tu chỉnh <100%>→<80%>, thu hoạch ngoài định mức tu dưỡng thời gian <12 thiên >]",
        "[ hệ thống: Cảnh tượng khen thưởng đã phát ra, thỉnh tại lần sau cảnh tượng trước khi bắt đầu lĩnh khen thưởng ]",
        "[ hệ thống: Luy kế hoàn thành cảnh tượng: <1 thứ >. Đạt được khen thưởng: Mở ra hệ thống kỹ năng module. ]",
        "[ hệ thống: Thu hoạch thành tựu < dâm ngược người phóng khoáng: Tại đơn thứ cảnh tượng trung đạt được dâm ngược đếm lớn hơn 15000 điểm >, thỉnh tại lần sau cảnh tượng phía trước lĩnh khen thưởng ]",
        "[ hệ thống: Kí chủ trở lại chủ thế giới, khoảng cách lần sau cảnh tượng bắt đầu còn có <1 3 ngày 22 giờ 32 phút >]",
        "[ hệ thống: Kiểm tra đến kí chủ tinh thần dị thường, tự động mở ra khôi phục module ]",
        "[ thanh toán: [ tinh thần khôi phục 1 cấp (24 giờ)], dâm ngược đếm <-240 điểm >. Trước mặt dâm ngược đếm <15034 điểm >]",
        "[ hệ thống: Kiểm tra đến kí chủ tinh thần dị thường, khôi phục module cường độ gia tăng ]",
        "[ thanh toán: [ tinh thần khôi phục 2 cấp (24 giờ)], dâm ngược đếm <-720 điểm >. Trước mặt dâm ngược đếm <14314 điểm >]",
        "[ hệ thống: Kiểm tra đến kí chủ tinh thần vững vàng, tinh thần khôi phục module đóng lại ]",
        "Ta nằm ở ký túc xá trên giường, cái gọi là hệ thống nhắc nhở đang ở trước mắt lóe lên. Mặc dù nói chỉ cần một cái ý nghĩ liền có thể đem những cái này chướng mắt nhắc nhở tắt đi, nhưng là ta lại một chút cũng cạn sạch sức lực đầu.",
        '"A, cứ như vậy đi..."',
        "Thời gian dài nằm tại trên giường, đau thắt lưng, cũng không nguyện ý động, nghĩ xoay người nhưng là không có sức mạnh.",
        "Nói lên ta nằm trên giường thời gian rất dài nữa à."
    )
    returnVoiceIds = $true
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "http://localhost:11110/api/role-detection/detect" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$response | ConvertTo-Json -Depth 10

