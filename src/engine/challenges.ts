import { VFSCommands } from "../vfs/commands";
import { gitService } from "../vfs/git";

export type Difficulty = 'Dễ' | 'Trung bình' | 'Khó';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  story: string; // Context/Scenario
  difficulty: Difficulty;
  setup: (vfs: VFSCommands) => Promise<void>; // Prepare the environment (broken state)
  verify: (vfs: VFSCommands) => Promise<boolean | string>; // Return true if success, or error message string
  hints: string[];
  solution?: string; // Explanation of the solution
}

export const challenges: Challenge[] = [
  {
    id: 'fix-broken-server',
    title: 'Máy Chủ Im Lặng',
    description: 'Một máy chủ Node.js không khởi động được. Hãy tìm và sửa lỗi.',
    story: `
      Bạn là kỹ sư trực sự cố. Máy chủ 'server.js' trên môi trường Production vừa bị sập.
      Quản lý nói: "Nó vẫn chạy tốt cho đến khi tôi thêm tính năng log mới!"
      
      Mục tiêu:
      1. Chạy thử máy chủ để xem lỗi.
      2. Sửa lỗi cú pháp trong file 'server.js'.
      3. Xác minh nó chạy thành công (in ra "Server started on port 3000").
    `,
    difficulty: 'Dễ',
    setup: async (vfs) => {
      await vfs.writeFile('server.js', `
const fs = require('fs');
console.log("Starting server...");

function start() {
  // Lỗi cú pháp ở đây: thiếu dấu đóng ngoặc
  console.log("Initializing database..."
}

start();
console.log("Server started on port 3000");
      `);
    },
    verify: async (vfs) => {
      try {
        const content = await vfs.cat('server.js');
        if (!content.includes('console.log("Initializing database...");')) {
           if (content.includes('console.log("Initializing database..."')) {
             return "Lỗi cú pháp vẫn còn. Kiểm tra các dòng console.log.";
           }
        }
        if (!content.includes('Server started on port 3000')) {
          return "Thông báo khởi động máy chủ bị thiếu.";
        }
        return true;
      } catch (e) {
        return "File server.js bị thiếu!";
      }
    },
    hints: [
      "Thử chạy 'node server.js' để xem nó báo lỗi ở đâu.",
      "Thông báo lỗi thường chỉ ra số dòng bị sai.",
      "Dùng 'nano server.js' để sửa file."
    ],
    solution: "Mở file bằng `nano server.js`, tìm đến dòng `console.log(\"Initializing database...\"` và thêm dấu `);` vào cuối dòng. Lưu lại và chạy `node server.js`."
  },
  {
    id: 'merge-conflict-rescue',
    title: 'Xung Đột Merge',
    description: 'Hai lập trình viên cùng sửa một file. Bạn phải giải quyết xung đột.',
    story: `
      Nhánh 'feature' có những thay đổi xung đột với nhánh 'main'.
      
      Mục tiêu:
      1. Thử merge nhánh 'feature' vào 'main'.
      2. Sửa xung đột trong file 'config.json'.
      3. Giữ lại cổng (port) 8080 từ nhánh 'feature', nhưng giữ lại host 'localhost' từ nhánh 'main'.
      4. Commit kết quả sau khi sửa.
    `,
    difficulty: 'Trung bình',
    setup: async (vfs) => {
      await gitService.init(vfs.cwdId);
      
      // Base
      await vfs.writeFile('config.json', '{\n  "host": "localhost",\n  "port": 3000\n}');
      await gitService.add(vfs.cwdId, '.');
      await gitService.commit(vfs.cwdId, 'Cau hinh co ban');
      
      // Feature branch
      await gitService.createBranch(vfs.cwdId, 'feature');
      await gitService.checkout(vfs.cwdId, 'feature');
      await vfs.writeFile('config.json', '{\n  "host": "0.0.0.0",\n  "port": 8080\n}');
      await gitService.add(vfs.cwdId, '.');
      await gitService.commit(vfs.cwdId, 'Cap nhat port 8080');
      
      // Main branch
      await gitService.checkout(vfs.cwdId, 'main');
      await vfs.writeFile('config.json', '{\n  "host": "127.0.0.1",\n  "port": 3000\n}');
      await gitService.add(vfs.cwdId, '.');
      await gitService.commit(vfs.cwdId, 'Cap nhat host IP');
    },
    verify: async (vfs) => {
      try {
        const repo = await gitService.findRepoRoot(vfs.cwdId);
        if (!repo) return "Không tìm thấy Git repo!";
        
        const content = await vfs.cat('config.json');
        if (content.includes('<<<<<<<') || content.includes('=======')) {
          return "Vẫn còn dấu hiệu xung đột (conflict markers) trong config.json";
        }
        
        if (!content.includes('8080')) return "Port phải là 8080 (từ nhánh feature)";
        if (!content.includes('127.0.0.1')) return "Host phải là 127.0.0.1 (từ nhánh main)";
        
        return true;
      } catch (e) {
        return "Lỗi kiểm tra: " + e;
      }
    },
    hints: [
      "Chạy 'git merge feature' trước.",
      "Dùng 'cat config.json' để xem chỗ bị xung đột.",
      "Sửa file để xóa các dấu <<<<, ====, >>>> và giữ lại nội dung đúng.",
      "Đừng quên 'git add' và 'git commit' sau khi sửa xong."
    ],
    solution: "1. `git merge feature` (sẽ báo conflict)\n2. `nano config.json`\n3. Xóa các dòng đánh dấu conflict, sửa thành:\n`{\n  \"host\": \"127.0.0.1\",\n  \"port\": 8080\n}`\n4. `git add config.json`\n5. `git commit -m \"Fix conflict\"`"
  },
  {
    id: 'permission-denied',
    title: 'Bị Cấm Cửa',
    description: 'Bạn cần chạy một script, nhưng không có quyền thực thi.',
    story: `
      Có một script bí mật tên là 'launch_rocket.sh' trong thư mục 'restricted'.
      Bạn cần kích hoạt nó để phóng tên lửa.
      
      Mục tiêu:
      1. Tìm file script đó.
      2. Thử chạy nó (sẽ thất bại).
      3. Cấp quyền thực thi cho file.
      4. Chạy nó thành công.
    `,
    difficulty: 'Dễ',
    setup: async (vfs) => {
      await vfs.mkdir('restricted');
      await vfs.writeFile('restricted/launch_rocket.sh', 'echo "🚀 Tên lửa đã phóng!"');
      // Mặc định tạo file là rw-r--r-- (không có x)
    },
    verify: async (vfs) => {
       const node = await vfs.resolvePath('restricted/launch_rocket.sh', vfs.cwdId);
       if (node && node.permissions.includes('x')) return true;
       return "File vẫn chưa có quyền thực thi (executable permission).";
    },
    hints: [
      "Dùng 'ls -l' để kiểm tra quyền hiện tại.",
      "Lệnh 'chmod' là chìa khóa.",
      "Cần thêm quyền 'x' (execute)."
    ],
    solution: "Chạy `chmod +x restricted/launch_rocket.sh` để cấp quyền thực thi."
  },
  {
    id: 'docker-container-run',
    title: 'Container Bị Mất Tích',
    description: 'Khởi chạy một container Nginx để phục vụ web.',
    story: `
      Sếp yêu cầu bạn dựng một web server Nginx ngay lập tức.
      
      Mục tiêu:
      1. Dùng Docker để chạy một container từ image 'nginx:latest'.
      2. Đặt tên container là 'my-web'.
      3. Kiểm tra xem nó có đang chạy không.
    `,
    difficulty: 'Dễ',
    setup: async (vfs) => {
      // Không cần setup gì đặc biệt, môi trường Docker giả lập đã sẵn sàng
    },
    verify: async (vfs) => {
       // Kiểm tra danh sách container đang chạy (giả lập)
       // Chúng ta cần truy cập trạng thái DockerEngine. 
       // Hiện tại DockerEngine không lưu trạng thái vào VFS hay global state dễ truy cập từ đây.
       // Tuy nhiên, trong Shell.ts, docker engine được khởi tạo.
       // Để đơn giản cho MVP, ta có thể kiểm tra lịch sử lệnh 'docker run ... --name my-web ...'
       // Nhưng cách tốt nhất là check trạng thái thực.
       // Tạm thời ta check lịch sử lệnh gần nhất trong DB history? Không chính xác lắm.
       
       // Hack: Ta sẽ check file log ảo nếu DockerEngine ghi log? Không.
       // Ta sẽ giả định thành công nếu người dùng gõ đúng lệnh (được check bởi Shell logic hoặc ta check history).
       
       // Cải tiến: DockerEngine nên lưu state vào localStorage hoặc DB để persistence.
       // Tạm thời: Check history lệnh.
       return "Chức năng kiểm tra Docker đang được cập nhật. Hãy tự kiểm tra bằng 'docker ps'.";
    },
    hints: [
      "Dùng lệnh 'docker run'.",
      "Đừng quên tham số '--name' để đặt tên.",
      "Dùng 'docker ps' để liệt kê container."
    ],
    solution: "`docker run --name my-web -d nginx:latest`"
  },
  {
    id: 'network-curl-debug',
    title: 'Thám Tử Mạng',
    description: 'Một API đang trả về dữ liệu lạ. Hãy điều tra header của nó.',
    story: `
      Một dịch vụ tại 'https://api.example.com/secret' đang cư xử lạ lùng.
      Chúng tôi nghi ngờ nó đang giấu thông tin trong HTTP Header.
      
      Mục tiêu:
      1. Dùng curl để gửi request đến URL đó.
      2. Chỉ hiển thị Header của phản hồi (không lấy body).
      3. Tìm header có tên 'X-Secret-Code'.
    `,
    difficulty: 'Trung bình',
    setup: async (vfs) => {
       // Network mock trong Shell.ts cần hỗ trợ URL này
       // Ta cần update Network.ts để mock endpoint này
    },
    verify: async (vfs) => {
       // Tương tự, khó verify nếu không can thiệp vào luồng chạy.
       // Ta có thể check history xem đã chạy curl -I hoặc curl --head chưa.
       return "Hãy tự kiểm tra bằng mắt thường xem có thấy X-Secret-Code không nhé!";
    },
    hints: [
      "Dùng cờ '-I' hoặc '--head' với curl.",
      "URL là https://api.example.com/secret"
    ],
    solution: "`curl -I https://api.example.com/secret`"
  }
];

