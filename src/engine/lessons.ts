import { Lesson } from './types';
import { gitService } from '../vfs/git';

export const lessons: Lesson[] = [
  {
    id: 'basic-training',
    title: 'Khóa Huấn Luyện Cơ Bản',
    description: 'Bài tập tổng hợp giúp bạn làm quen với các thao tác cốt lõi nhất trong môi trường dòng lệnh (CLI).',
    theory: `
### Chào mừng đến với Command Line Interface (CLI)!

CLI là nơi bạn ra lệnh cho máy tính bằng văn bản thay vì chuột.
Các khái niệm cơ bản:
- **Thư mục (Directory):** Giống như Folder trong Windows/macOS.
- **Đường dẫn (Path):** Địa chỉ của tệp tin (ví dụ: \`/home/user/docs\`).
- **Lệnh (Command):** Từ khóa để thực hiện hành động (ví dụ: \`ls\` để liệt kê).

**Các lệnh sẽ học:**
- \`pwd\` (Print Working Directory): Bạn đang ở đâu?
- \`ls\` (List): Có gì ở đây?
- \`cd\` (Change Directory): Đi đến nơi khác.
- \`mkdir\` (Make Directory): Tạo thư mục mới.
- \`touch\`: Tạo tệp tin rỗng.
- \`rm\` (Remove): Xóa tệp tin (cẩn thận!).
    `,
    tasks: [
      {
        id: 'pwd-1',
        description: 'Kiểm tra vị trí hiện tại của bạn trong hệ thống tệp.',
        commandHint: 'pwd',
        verify: async (vfs, cmd) => cmd.trim() === 'pwd'
      },
      {
        id: 'ls-1',
        description: 'Liệt kê các tệp và thư mục đang có xung quanh bạn.',
        commandHint: 'ls',
        verify: async (vfs, cmd) => cmd.trim().startsWith('ls')
      },
      {
        id: 'mkdir-1',
        description: 'Tạo một thư mục mới có tên là "workspace" để làm việc.',
        commandHint: 'mkdir workspace',
        verify: async (vfs, cmd) => {
          try {
            const pwd = await vfs.pwd();
            const items = await vfs.ls(pwd);
            return items.includes('workspace');
          } catch { return false; }
        }
      },
      {
        id: 'cd-1',
        description: 'Di chuyển vào thư mục "workspace" vừa tạo.',
        commandHint: 'cd workspace',
        verify: async (vfs, cmd) => {
          const pwd = await vfs.pwd();
          return pwd.endsWith('/workspace');
        }
      },
      {
        id: 'touch-1',
        description: 'Tạo một tệp tin văn bản trống có tên "notes.txt".',
        commandHint: 'touch notes.txt',
        verify: async (vfs, cmd) => {
          try {
            const pwd = await vfs.pwd();
            const items = await vfs.ls(pwd);
            return items.includes('notes.txt');
          } catch { return false; }
        }
      },
      {
        id: 'echo-1',
        description: 'Ghi dòng chữ "Hello CLI" vào tệp notes.txt.',
        commandHint: 'echo "Hello CLI" > notes.txt',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('notes.txt');
            return content.includes('Hello CLI');
          } catch { return false; }
        }
      },
      {
        id: 'cat-1',
        description: 'Đọc và in nội dung của tệp notes.txt ra màn hình để kiểm tra.',
        commandHint: 'cat notes.txt',
        verify: async (vfs, cmd) => cmd.trim().startsWith('cat') && cmd.includes('notes.txt')
      },
      {
        id: 'rm-1',
        description: 'Dọn dẹp không gian làm việc bằng cách xóa tệp notes.txt.',
        commandHint: 'rm notes.txt',
        verify: async (vfs, cmd) => {
          try {
            const pwd = await vfs.pwd();
            const items = await vfs.ls(pwd);
            return !items.includes('notes.txt');
          } catch { return false; }
        }
      },
      {
        id: 'cd-2',
        description: 'Quay trở lại thư mục gốc (root) để hoàn thành bài tập.',
        commandHint: 'cd /',
        verify: async (vfs, cmd) => {
          const pwd = await vfs.pwd();
          return pwd === '/';
        }
      }
    ]
  },
  {
    id: 'intermediate-training',
    title: 'Thao Tác Trung Bình',
    description: 'Học cách sao chép (cp), di chuyển/đổi tên (mv), nối thêm dữ liệu (>>) và quản lý cấu trúc thư mục.',
    theory: `
### Quản lý Tệp Tin Nâng Cao

Khi đã quen với việc tạo và xóa, bạn cần học cách di chuyển và sao chép dữ liệu.

**Các lệnh quan trọng:**
- \`cp\` (Copy): Tạo bản sao của tệp tin. Cần chỉ định nguồn và đích.
  - Ví dụ: \`cp file.txt backup.txt\`
- \`mv\` (Move): Di chuyển tệp tin. Lệnh này cũng dùng để **Đổi tên (Rename)**.
  - Di chuyển: \`mv file.txt folder/\`
  - Đổi tên: \`mv old.txt new.txt\`
- \`>\` (Redirect Output): Ghi đè kết quả của lệnh vào tệp tin.
- \`>>\` (Append Output): Nối thêm kết quả vào cuối tệp tin (không xóa nội dung cũ).
    `,
    tasks: [
      {
        id: 'cd-home',
        description: 'Đảm bảo bạn đang ở thư mục /home/user.',
        commandHint: 'cd /home/user',
        verify: async (vfs, cmd) => {
          const pwd = await vfs.pwd();
          return pwd === '/home/user';
        }
      },
      {
        id: 'mkdir-config',
        description: 'Tạo một thư mục tên là "project_config".',
        commandHint: 'mkdir project_config',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return items.includes('project_config');
          } catch { return false; }
        }
      },
      {
        id: 'echo-config',
        description: 'Tạo tệp config.txt chứa nội dung "PORT=8080".',
        commandHint: 'echo "PORT=8080" > config.txt',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('config.txt');
            return content.includes('PORT=8080');
          } catch { return false; }
        }
      },
      {
        id: 'append-config',
        description: 'Nối thêm dòng "ENV=production" vào cuối tệp config.txt.',
        commandHint: 'echo "ENV=production" >> config.txt',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('config.txt');
            return content.includes('PORT=8080') && content.includes('ENV=production');
          } catch { return false; }
        }
      },
      {
        id: 'cat-config',
        description: 'Kiểm tra lại nội dung của tệp config.txt.',
        commandHint: 'cat config.txt',
        verify: async (vfs, cmd) => cmd.trim().startsWith('cat') && cmd.includes('config.txt')
      },
      {
        id: 'cp-config',
        description: 'Sao chép tệp config.txt thành config.backup.',
        commandHint: 'cp config.txt config.backup',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('config.backup');
            return content.includes('PORT=8080');
          } catch { return false; }
        }
      },
      {
        id: 'mv-config-rename',
        description: 'Đổi tên tệp config.backup thành backup.txt.',
        commandHint: 'mv config.backup backup.txt',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return items.includes('backup.txt') && !items.includes('config.backup');
          } catch { return false; }
        }
      },
      {
        id: 'mv-config-move',
        description: 'Di chuyển tệp config.txt vào trong thư mục project_config.',
        commandHint: 'mv config.txt project_config',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('project_config');
            return items.includes('config.txt');
          } catch { return false; }
        }
      },
      {
        id: 'ls-config',
        description: 'Liệt kê nội dung bên trong thư mục project_config để kiểm tra.',
        commandHint: 'ls project_config',
        verify: async (vfs, cmd) => cmd.trim().startsWith('ls') && cmd.includes('project_config')
      },
      {
        id: 'rm-backup',
        description: 'Xóa tệp backup.txt vì không còn cần thiết.',
        commandHint: 'rm backup.txt',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return !items.includes('backup.txt');
          } catch { return false; }
        }
      }
    ]
  },
  {
    id: 'advanced-training',
    title: 'Thao Tác Nâng Cao',
    description: 'Xây dựng cấu trúc dự án phức tạp, thao tác với đường dẫn tương đối và quản lý tệp tin hàng loạt.',
    theory: `
### Cấu Trúc Dự Án Thực Tế

Trong các dự án phần mềm, tệp tin thường được tổ chức theo cấu trúc chuẩn:
- \`src/\` (Source): Chứa mã nguồn gốc.
- \`dist/\` (Distribution) hoặc \`build/\`: Chứa mã đã biên dịch để chạy.
- \`docs/\`: Tài liệu hướng dẫn.

**Kỹ năng cần có:**
- **Đường dẫn tương đối (Relative Path):** \`./\` (hiện tại), \`../\` (cha).
- **Thao tác hàng loạt:** Sao chép/Di chuyển nhiều tệp cùng lúc.
- **Tư duy tổ chức:** Sắp xếp tệp tin gọn gàng, dễ tìm kiếm.
    `,
    tasks: [
      {
        id: 'cd-home-adv',
        description: 'Đảm bảo bạn đang ở thư mục /home/user.',
        commandHint: 'cd /home/user',
        verify: async (vfs, cmd) => {
          const pwd = await vfs.pwd();
          return pwd === '/home/user';
        }
      },
      {
        id: 'mkdir-app',
        description: 'Tạo thư mục "app_build".',
        commandHint: 'mkdir app_build',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return items.includes('app_build');
          } catch { return false; }
        }
      },
      {
        id: 'cd-app',
        description: 'Di chuyển vào thư mục "app_build".',
        commandHint: 'cd app_build',
        verify: async (vfs, cmd) => {
          const pwd = await vfs.pwd();
          return pwd.endsWith('/app_build');
        }
      },
      {
        id: 'mkdir-src-dist',
        description: 'Tạo thư mục "src".',
        commandHint: 'mkdir src',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return items.includes('src');
          } catch { return false; }
        }
      },
      {
        id: 'mkdir-dist',
        description: 'Tạo thư mục "dist".',
        commandHint: 'mkdir dist',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return items.includes('dist');
          } catch { return false; }
        }
      },
      {
        id: 'touch-main',
        description: 'Tạo tệp main.js trong thư mục src với nội dung "console.log(\'main\')".',
        commandHint: 'echo "console.log(\'main\')" > src/main.js',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('src/main.js');
            return content.includes('main');
          } catch { return false; }
        }
      },
      {
        id: 'touch-utils',
        description: 'Tạo tệp utils.js trong thư mục src với nội dung "console.log(\'utils\')".',
        commandHint: 'echo "console.log(\'utils\')" > src/utils.js',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('src/utils.js');
            return content.includes('utils');
          } catch { return false; }
        }
      },
      {
        id: 'cp-main-dist',
        description: 'Sao chép tệp main.js từ src sang dist.',
        commandHint: 'cp src/main.js dist/',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('dist/main.js');
            return content.includes('main');
          } catch { return false; }
        }
      },
      {
        id: 'mv-utils-dist',
        description: 'Di chuyển và đổi tên tệp utils.js từ src sang dist thành helper.js.',
        commandHint: 'mv src/utils.js dist/helper.js',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('dist/helper.js');
            return content.includes('utils');
          } catch { return false; }
        }
      },
      {
        id: 'rm-src',
        description: 'Xóa toàn bộ thư mục src (lệnh rm của chúng ta hỗ trợ xóa đệ quy thư mục).',
        commandHint: 'rm src',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return !items.includes('src');
          } catch { return false; }
        }
      }
    ]
  },
  {
    id: 'search-filter-training',
    title: 'Tìm Kiếm & Lọc Dữ Liệu',
    description: 'Làm quen với các công cụ tìm kiếm mạnh mẽ (grep, find) và kỹ thuật đường ống (pipe) để xử lý dữ liệu.',
    theory: `
### Sức Mạnh Của Tìm Kiếm

Khi làm việc với hàng ngàn tệp tin hoặc log dài vô tận, bạn không thể đọc bằng mắt.

**Công cụ:**
- \`grep\` (Global Regular Expression Print): Tìm kiếm nội dung **bên trong** tệp tin.
  - Ví dụ: \`grep "Error" app.log\`
- \`find\`: Tìm kiếm **tên tệp tin** trong hệ thống.
  - Ví dụ: \`find . -name "*.log"\`
- \`|\` (Pipe): Chuyển kết quả của lệnh trước làm đầu vào cho lệnh sau.
  - Ví dụ: \`cat log.txt | grep "Error"\` (Đọc file -> Lọc lấy dòng lỗi).
    `,
    tasks: [
      {
        id: 'mkdir-logs',
        description: 'Tạo thư mục "logs" để chứa các tệp nhật ký.',
        commandHint: 'mkdir logs',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('.');
            return items.includes('logs');
          } catch { return false; }
        }
      },
      {
        id: 'create-log',
        description: 'Tạo tệp logs/app.log với dòng lỗi giả lập "Error: Something went wrong".',
        commandHint: 'echo "Error: Something went wrong" > logs/app.log',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('logs/app.log');
            return content.includes('Error: Something went wrong');
          } catch { return false; }
        }
      },
      {
        id: 'append-log-1',
        description: 'Thêm dòng thông tin "Info: System started" vào logs/app.log.',
        commandHint: 'echo "Info: System started" >> logs/app.log',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('logs/app.log');
            return content.includes('Info: System started');
          } catch { return false; }
        }
      },
      {
        id: 'append-log-2',
        description: 'Thêm dòng lỗi thứ hai "Error: Database connection failed" vào logs/app.log.',
        commandHint: 'echo "Error: Database connection failed" >> logs/app.log',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('logs/app.log');
            return content.includes('Error: Database connection failed');
          } catch { return false; }
        }
      },
      {
        id: 'grep-error',
        description: 'Sử dụng grep để chỉ hiển thị các dòng chứa chữ "Error" trong tệp logs/app.log.',
        commandHint: 'grep Error logs/app.log',
        verify: async (vfs, cmd) => cmd.trim().startsWith('grep') && cmd.includes('Error')
      },
      {
        id: 'find-log',
        description: 'Sử dụng lệnh find để tìm kiếm tệp có tên "app.log" trong thư mục hiện tại.',
        commandHint: 'find . -name app.log',
        verify: async (vfs, cmd) => cmd.trim().startsWith('find') && cmd.includes('app.log')
      },
      {
        id: 'pipe-grep',
        description: 'Sử dụng pipe (|) để đọc tệp logs/app.log bằng cat và lọc lấy dòng chứa "Info".',
        commandHint: 'cat logs/app.log | grep Info',
        verify: async (vfs, cmd) => cmd.includes('|') && cmd.includes('grep')
      }
    ]
  },
  {
    id: 'permissions-system-training',
    title: 'Quyền Hạn & Hệ Thống',
    description: 'Hiểu về quyền truy cập tệp tin (chmod), người dùng (whoami) và quản trị hệ thống cơ bản.',
    theory: `
### Ai Được Phép Làm Gì?

Linux/Unix bảo mật bằng hệ thống quyền hạn (Permissions) chặt chẽ.
Mỗi tệp tin có 3 nhóm quyền:
1. **Owner (u):** Người tạo ra tệp.
2. **Group (g):** Nhóm người dùng chung.
3. **Others (o):** Những người còn lại.

**Các quyền:**
- **r (Read - 4):** Đọc nội dung.
- **w (Write - 2):** Sửa/Xóa nội dung.
- **x (Execute - 1):** Chạy chương trình/script.

**Lệnh:**
- \`chmod +x script.sh\`: Thêm quyền chạy.
- \`chmod 755\`: rwxr-xr-x (Owner full, người khác chỉ đọc/chạy).
    `,
    tasks: [
      {
        id: 'whoami-check',
        description: 'Kiểm tra xem bạn đang đăng nhập với tư cách người dùng nào.',
        commandHint: 'whoami',
        verify: async (vfs, cmd) => cmd.trim() === 'whoami'
      },
      {
        id: 'create-script',
        description: 'Tạo một tệp script tên là "deploy.sh" với nội dung "echo Deploying...".',
        commandHint: 'echo "echo Deploying..." > deploy.sh',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('deploy.sh');
            return content.includes('Deploying');
          } catch { return false; }
        }
      },
      {
        id: 'ls-l-check',
        description: 'Sử dụng lệnh ls -l để xem quyền hạn hiện tại của tệp deploy.sh (mặc định là rw-r--r--).',
        commandHint: 'ls -l',
        verify: async (vfs, cmd) => cmd.includes('ls') && cmd.includes('-l')
      },
      {
        id: 'chmod-x',
        description: 'Cấp quyền thực thi (execute) cho tệp deploy.sh bằng lệnh chmod +x.',
        commandHint: 'chmod +x deploy.sh',
        verify: async (vfs, cmd) => cmd.trim().startsWith('chmod') && cmd.includes('+x')
      },
      {
        id: 'chmod-777',
        description: 'Thử thay đổi quyền hạn thành rwxrwxrwx (777) cho deploy.sh (không khuyến khích trong thực tế!).',
        commandHint: 'chmod 777 deploy.sh',
        verify: async (vfs, cmd) => cmd.trim().startsWith('chmod') && cmd.includes('777')
      },
      {
        id: 'sudo-fake',
        description: 'Giả lập chạy lệnh với quyền siêu người dùng (root) bằng sudo.',
        commandHint: 'sudo echo "I am root"',
        verify: async (vfs, cmd) => cmd.trim().startsWith('sudo')
      }
    ]
  },
  {
    id: 'git-basics',
    title: 'Git Cơ Bản',
    description: 'Làm quen với hệ thống quản lý phiên bản Git: init, status, add, commit và log.',
    theory: `
### Cỗ Máy Thời Gian Cho Code

Git giúp bạn lưu lại lịch sử thay đổi của dự án, giống như Checkpoint trong game.

**Quy trình cơ bản:**
1. **Working Directory:** Nơi bạn đang sửa code.
2. **Staging Area (\`git add\`):** Chọn những file muốn lưu.
3. **Repository (\`git commit\`):** Chụp ảnh (Snapshot) và lưu vĩnh viễn.

**Lệnh:**
- \`git init\`: Bắt đầu theo dõi thư mục này.
- \`git status\`: Tình hình thế nào rồi?
- \`git log\`: Xem lại lịch sử.
    `,
    tasks: [
      {
        id: 'git-init',
        description: 'Khởi tạo một kho chứa Git (repository) mới trong thư mục hiện tại.',
        commandHint: 'git init',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            return !!repo;
          } catch { return false; }
        }
      },
      {
        id: 'git-status-1',
        description: 'Kiểm tra trạng thái của kho chứa. Bạn sẽ thấy chưa có gì để commit.',
        commandHint: 'git status',
        verify: async (vfs, cmd) => cmd.trim() === 'git status'
      },
      {
        id: 'create-readme',
        description: 'Tạo một tệp README.md với nội dung "My Project".',
        commandHint: 'echo "My Project" > README.md',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('README.md');
            return content.includes('My Project');
          } catch { return false; }
        }
      },
      {
        id: 'git-status-2',
        description: 'Kiểm tra lại trạng thái. README.md sẽ hiện là "Untracked files" (màu đỏ).',
        commandHint: 'git status',
        verify: async (vfs, cmd) => cmd.trim() === 'git status'
      },
      {
        id: 'git-add',
        description: 'Đưa tệp README.md vào khu vực chờ (Staging Area).',
        commandHint: 'git add README.md',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return !!state.staging['README.md'];
          } catch { return false; }
        }
      },
      {
        id: 'git-status-3',
        description: 'Kiểm tra trạng thái lần nữa. README.md sẽ chuyển sang "Changes to be committed" (màu xanh).',
        commandHint: 'git status',
        verify: async (vfs, cmd) => cmd.trim() === 'git status'
      },
      {
        id: 'git-commit',
        description: 'Lưu lại thay đổi (commit) với thông điệp "Initial commit".',
        commandHint: 'git commit -m "Initial commit"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message.includes('Initial commit');
          } catch { return false; }
        }
      },
      {
        id: 'git-log',
        description: 'Xem lịch sử các lần commit của bạn.',
        commandHint: 'git log',
        verify: async (vfs, cmd) => cmd.trim() === 'git log'
      }
    ]
  },
  {
    id: 'git-advanced',
    title: 'Git Nâng Cao',
    description: 'Học cách làm việc với nhánh (branch), chuyển đổi (checkout) và hợp nhất (merge) mã nguồn.',
    theory: `
### Đa Vũ Trụ (Branches)

Git cho phép bạn tạo ra các phiên bản song song của dự án (Branches).
- **main/master:** Nhánh chính, ổn định.
- **feature:** Nhánh để thử nghiệm tính năng mới.

**Lệnh:**
- \`git branch\`: Xem/Tạo nhánh.
- \`git checkout\`: Chuyển sang nhánh khác.
- \`git merge\`: Gộp nhánh phụ vào nhánh chính.
    `,
    tasks: [
      {
        id: 'git-init-adv',
        description: 'Bắt đầu bằng cách khởi tạo một kho chứa Git mới.',
        commandHint: 'git init',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            return !!repo;
          } catch { return false; }
        }
      },
      {
        id: 'create-main-file',
        description: 'Tạo tệp main.txt với nội dung "Version 1".',
        commandHint: 'echo "Version 1" > main.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('main.txt')).includes('Version 1'); } catch { return false; }
        }
      },
      {
        id: 'git-add-adv',
        description: 'Đưa tệp main.txt vào Staging Area.',
        commandHint: 'git add main.txt',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return !!state.staging['main.txt'];
          } catch { return false; }
        }
      },
      {
        id: 'git-commit-adv',
        description: 'Commit phiên bản đầu tiên.',
        commandHint: 'git commit -m "v1"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message === 'v1';
          } catch { return false; }
        }
      },
      {
        id: 'git-branch',
        description: 'Tạo một nhánh mới tên là "feature".',
        commandHint: 'git branch feature',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return !!state.branches['feature'];
          } catch { return false; }
        }
      },
      {
        id: 'git-checkout',
        description: 'Chuyển sang nhánh "feature" để làm việc.',
        commandHint: 'git checkout feature',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return state.currentBranch === 'feature';
          } catch { return false; }
        }
      },
      {
        id: 'update-feature',
        description: 'Trên nhánh feature, sửa tệp main.txt thành "Version 2".',
        commandHint: 'echo "Version 2" > main.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('main.txt')).includes('Version 2'); } catch { return false; }
        }
      },
      {
        id: 'git-add-feature',
        description: 'Stage thay đổi trên nhánh feature.',
        commandHint: 'git add .',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return !!state.staging['main.txt'];
          } catch { return false; }
        }
      },
      {
        id: 'git-commit-feature',
        description: 'Commit thay đổi trên nhánh feature.',
        commandHint: 'git commit -m "v2"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message === 'v2';
          } catch { return false; }
        }
      },
      {
        id: 'checkout-main',
        description: 'Quay trở lại nhánh "main".',
        commandHint: 'git checkout main',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return state.currentBranch === 'main';
          } catch { return false; }
        }
      },
      {
        id: 'verify-old-content',
        description: 'Kiểm tra nội dung tệp main.txt. Bạn sẽ thấy nó quay về "Version 1" (do đang ở nhánh main).',
        commandHint: 'cat main.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('main.txt')).includes('Version 1'); } catch { return false; }
        }
      },
      {
        id: 'git-merge',
        description: 'Hợp nhất nhánh "feature" vào nhánh "main".',
        commandHint: 'git merge feature',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const mainHash = state.branches['main'];
            const featureHash = state.branches['feature'];
            // After fast-forward merge, hashes should be same
            return mainHash === featureHash;
          } catch { return false; }
        }
      },
      {
        id: 'verify-merge',
        description: 'Kiểm tra lại nội dung tệp main.txt sau khi merge. Giờ nó đã là "Version 2".',
        commandHint: 'cat main.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('main.txt')).includes('Version 2'); } catch { return false; }
        }
      }
    ]
  },
  {
    id: 'io-redirection-pipelines',
    title: 'I/O Redirection & Pipelines',
    description: 'Học cách điều hướng dữ liệu giữa các lệnh và tệp tin bằng Redirection (>, >>) và Pipelines (|).',
    theory: `
### Dòng Chảy Dữ Liệu (Streams)

Mọi chương trình Linux đều có 3 cổng giao tiếp:
1. **Stdin (0):** Đầu vào (bàn phím).
2. **Stdout (1):** Đầu ra (màn hình).
3. **Stderr (2):** Lỗi (màn hình).

**Redirection:** Thay đổi nơi dữ liệu đi đến.
- \`>\`: Ghi đè Stdout vào file.
- \`>>\`: Nối thêm Stdout vào file.
- \`|\` (Pipe): Nối Stdout của lệnh trước vào Stdin của lệnh sau.
    `,
    tasks: [
      {
        id: 'redirect-write',
        description: 'Sử dụng > để ghi kết quả của lệnh echo vào tệp "fruits.txt".',
        commandHint: 'echo "apple" > fruits.txt',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('fruits.txt');
            return content.trim() === 'apple';
          } catch { return false; }
        }
      },
      {
        id: 'redirect-append',
        description: 'Sử dụng >> để nối thêm "banana" vào cuối tệp "fruits.txt" mà không ghi đè.',
        commandHint: 'echo "banana" >> fruits.txt',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('fruits.txt');
            return content.includes('apple') && content.includes('banana');
          } catch { return false; }
        }
      },
      {
        id: 'cat-sort',
        description: 'Sử dụng pipe (|) để đọc tệp fruits.txt và sắp xếp nội dung theo thứ tự bảng chữ cái.',
        commandHint: 'cat fruits.txt | sort',
        verify: async (vfs, cmd) => cmd.includes('|') && cmd.includes('sort')
      },
      {
        id: 'uniq-count',
        description: 'Thêm một dòng "apple" nữa, sau đó dùng pipe kết hợp sort, uniq và wc để đếm số dòng duy nhất.',
        commandHint: 'echo "apple" >> fruits.txt && cat fruits.txt | sort | uniq | wc',
        verify: async (vfs, cmd) => {
           // Check if fruits.txt has duplicate apple first? 
           // Or just check command structure
           return cmd.includes('|') && cmd.includes('uniq') && cmd.includes('wc');
        }
      },
      {
        id: 'head-tail',
        description: 'Sử dụng head để xem 1 dòng đầu tiên của tệp fruits.txt.',
        commandHint: 'head -n 1 fruits.txt',
        verify: async (vfs, cmd) => cmd.startsWith('head')
      }
    ]
  },
  {
    id: 'network-basics',
    title: 'Mạng & Kết Nối (Network)',
    description: 'Sử dụng curl để tương tác với các dịch vụ mạng và API giả lập.',
    theory: `
### Giao Tiếp Qua Mạng (HTTP)

Khi bạn gõ địa chỉ web, trình duyệt gửi một **Request** và nhận về **Response**.
CLI dùng \`curl\` để làm điều tương tự.

**Các phương thức (Methods):**
- **GET:** Lấy dữ liệu (mặc định).
- **POST:** Gửi dữ liệu mới lên server.
- **HEAD:** Chỉ lấy thông tin headers (không tải nội dung).

**JSON:** Định dạng dữ liệu phổ biến nhất trên web (giống Object trong JS).
    `,
    tasks: [
      {
        id: 'curl-get',
        description: 'Gửi một yêu cầu GET đơn giản đến google.com.',
        commandHint: 'curl google.com',
        verify: async (vfs, cmd) => cmd.startsWith('curl') && cmd.includes('google.com')
      },
      {
        id: 'curl-api',
        description: 'Lấy danh sách người dùng từ API giả lập bằng phương thức GET.',
        commandHint: 'curl https://api.hintshell.com/users',
        verify: async (vfs, cmd) => cmd.includes('api.hintshell.com/users')
      },
      {
        id: 'curl-head',
        description: 'Chỉ kiểm tra headers của phản hồi (không lấy nội dung) bằng cờ -I.',
        commandHint: 'curl -I google.com',
        verify: async (vfs, cmd) => cmd.includes('-I') || cmd.includes('--head')
      },
      {
        id: 'curl-post',
        description: 'Gửi dữ liệu JSON lên server bằng phương thức POST.',
        commandHint: 'curl -X POST -d \'{"name":"Dave"}\' https://api.hintshell.com/users',
        verify: async (vfs, cmd) => (cmd.includes('-X POST') || cmd.includes('-d')) && cmd.includes('api.hintshell.com/users')
      }
    ]
  },
  {
    id: 'docker-basics',
    title: 'Docker Cơ Bản',
    description: 'Làm quen với Containerization: chạy, quản lý và dừng các container Docker.',
    theory: `
### Containerization (Đóng Gói)

Docker giúp bạn đóng gói ứng dụng và mọi thứ nó cần (code, thư viện, OS) vào một **Container**.
Khác với Máy Ảo (VM), Container nhẹ hơn nhiều vì dùng chung nhân (kernel) của máy chủ.

**Khái niệm:**
- **Image:** Bản thiết kế (Blueprint/Template).
- **Container:** Một phiên bản đang chạy của Image.

**Vòng đời:**
\`run\` (Tạo & Chạy) -> \`stop\` (Dừng) -> \`rm\` (Xóa).
    `,
    tasks: [
      {
        id: 'docker-run-hello',
        description: 'Chạy container "hello-world" để kiểm tra cài đặt Docker.',
        commandHint: 'docker run hello-world',
        verify: async (vfs, cmd) => cmd.trim() === 'docker run hello-world'
      },
      {
        id: 'docker-ps-all',
        description: 'Liệt kê tất cả các container (bao gồm cả những cái đã dừng) để thấy hello-world.',
        commandHint: 'docker ps -a',
        verify: async (vfs, cmd) => cmd.includes('docker ps') && cmd.includes('-a')
      },
      {
        id: 'docker-run-detached',
        description: 'Chạy một Nginx server dưới nền (detached mode) và đặt tên là "my-web".',
        commandHint: 'docker run -d --name my-web nginx',
        verify: async (vfs, cmd) => cmd.includes('docker run') && cmd.includes('-d') && cmd.includes('nginx')
      },
      {
        id: 'docker-ps',
        description: 'Kiểm tra các container đang chạy.',
        commandHint: 'docker ps',
        verify: async (vfs, cmd) => cmd.trim() === 'docker ps'
      },
      {
        id: 'docker-stop',
        description: 'Dừng container "my-web" đang chạy.',
        commandHint: 'docker stop my-web',
        verify: async (vfs, cmd) => cmd.startsWith('docker stop')
      },
      {
        id: 'docker-rm',
        description: 'Xóa container "my-web" để dọn dẹp.',
        commandHint: 'docker rm my-web',
        verify: async (vfs, cmd) => cmd.startsWith('docker rm')
      }
    ]
  },
  {
    id: 'git-remote',
    title: 'Git Remote & Collaboration',
    description: 'Học cách làm việc với kho chứa từ xa (remote repository): clone, push và remote.',
    tasks: [
      {
        id: 'git-clone',
        description: 'Clone một kho chứa từ xa về máy của bạn.',
        commandHint: 'git clone https://github.com/example/repo.git',
        verify: async (vfs, cmd) => cmd.startsWith('git clone')
      },
      {
        id: 'cd-repo',
        description: 'Di chuyển vào thư mục repo vừa clone.',
        commandHint: 'cd repo',
        verify: async (vfs, cmd) => cmd.trim() === 'cd repo'
      },
      {
        id: 'check-remote',
        description: 'Kiểm tra danh sách remote đã được cấu hình.',
        commandHint: 'git remote -v',
        verify: async (vfs, cmd) => cmd.includes('git remote')
      },
      {
        id: 'create-file-remote',
        description: 'Tạo một tệp mới để chuẩn bị đẩy lên server.',
        commandHint: 'echo "Hello Remote" > remote.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('remote.txt')).includes('Hello Remote'); } catch { return false; }
        }
      },
      {
        id: 'git-add-remote',
        description: 'Stage tệp vừa tạo.',
        commandHint: 'git add .',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return !!state.staging['remote.txt'];
          } catch { return false; }
        }
      },
      {
        id: 'git-commit-remote',
        description: 'Commit thay đổi.',
        commandHint: 'git commit -m "Add remote file"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message.includes('Add remote file');
          } catch { return false; }
        }
      },
      {
        id: 'git-push',
        description: 'Đẩy thay đổi lên nhánh main của remote origin.',
        commandHint: 'git push origin main',
        verify: async (vfs, cmd) => cmd.trim() === 'git push origin main'
      }
    ]
  },
  {
    id: 'git-conflict',
    title: 'Giải Quyết Xung Đột (Merge Conflict)',
    description: 'Thực hành xử lý khi hai nhánh cùng sửa đổi một dòng code (Conflict).',
    tasks: [
      {
        id: 'init-conflict',
        description: 'Khởi tạo repo mới để bắt đầu bài tập.',
        commandHint: 'git init',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            return !!repo;
          } catch { return false; }
        }
      },
      {
        id: 'create-base',
        description: 'Tạo file code.txt với nội dung "Base Content".',
        commandHint: 'echo "Base Content" > code.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('code.txt')).includes('Base Content'); } catch { return false; }
        }
      },
      {
        id: 'commit-base',
        description: 'Commit phiên bản gốc.',
        commandHint: 'git add . && git commit -m "Base"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message === 'Base';
          } catch { return false; }
        }
      },
      {
        id: 'branch-feature-c',
        description: 'Tạo nhánh "feature".',
        commandHint: 'git branch feature',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return !!state.branches['feature'];
          } catch { return false; }
        }
      },
      {
        id: 'checkout-feature-c',
        description: 'Chuyển sang nhánh "feature".',
        commandHint: 'git checkout feature',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return state.currentBranch === 'feature';
          } catch { return false; }
        }
      },
      {
        id: 'modify-feature',
        description: 'Sửa code.txt thành "Feature Change".',
        commandHint: 'echo "Feature Change" > code.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('code.txt')).includes('Feature Change'); } catch { return false; }
        }
      },
      {
        id: 'commit-feature-c',
        description: 'Commit thay đổi trên nhánh feature.',
        commandHint: 'git add . && git commit -m "Feature"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message === 'Feature';
          } catch { return false; }
        }
      },
      {
        id: 'checkout-main-c',
        description: 'Quay về nhánh main.',
        commandHint: 'git checkout main',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            return state.currentBranch === 'main';
          } catch { return false; }
        }
      },
      {
        id: 'modify-main',
        description: 'Sửa code.txt thành "Main Change" (khác với Feature Change -> sẽ gây conflict).',
        commandHint: 'echo "Main Change" > code.txt',
        verify: async (vfs, cmd) => {
           try { return (await vfs.cat('code.txt')).includes('Main Change'); } catch { return false; }
        }
      },
      {
        id: 'commit-main-c',
        description: 'Commit thay đổi trên nhánh main.',
        commandHint: 'git add . && git commit -m "Main"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message === 'Main';
          } catch { return false; }
        }
      },
      {
        id: 'merge-conflict',
        description: 'Thử merge nhánh feature vào main. Bạn sẽ gặp lỗi Conflict.',
        commandHint: 'git merge feature',
        verify: async (vfs, cmd) => cmd.trim() === 'git merge feature'
      },
      {
        id: 'view-conflict',
        description: 'Xem nội dung file bị conflict. Bạn sẽ thấy các dấu <<<<<<<, =======, >>>>>>>.',
        commandHint: 'cat code.txt',
        verify: async (vfs, cmd) => cmd.trim() === 'cat code.txt'
      },
      {
        id: 'resolve-conflict',
        description: 'Sửa file code.txt để giải quyết conflict (giữ lại nội dung bạn muốn, ví dụ "Final Code").',
        commandHint: 'echo "Final Code" > code.txt',
        verify: async (vfs, cmd) => {
           try { 
             const content = await vfs.cat('code.txt');
             return !content.includes('<<<<<<<') && !content.includes('=======');
           } catch { return false; }
        }
      },
      {
        id: 'commit-resolution',
        description: 'Stage và Commit file đã sửa để hoàn tất merge.',
        commandHint: 'git add . && git commit -m "Resolved"',
        verify: async (vfs, cmd) => {
          try {
            const repo = await gitService.findRepoRoot(vfs.cwdId);
            if (!repo) return false;
            const state = await gitService.getGitState(repo.id);
            const headHash = state.branches[state.currentBranch];
            const commit = state.commits[headHash];
            return commit && commit.message === 'Resolved';
          } catch { return false; }
        }
      }
    ]
  },
  {
    id: 'npm-basics',
    title: 'Node.js & NPM Cơ Bản',
    description: 'Làm quen với môi trường Node.js và trình quản lý gói NPM: init, install, run script.',
    tasks: [
      {
        id: 'node-version',
        description: 'Kiểm tra phiên bản Node.js đã cài đặt.',
        commandHint: 'node -v',
        verify: async (vfs, cmd) => cmd.trim() === 'node -v' || cmd.trim() === 'node --version'
      },
      {
        id: 'npm-version',
        description: 'Kiểm tra phiên bản NPM.',
        commandHint: 'npm -v',
        verify: async (vfs, cmd) => cmd.trim() === 'npm -v' || cmd.trim() === 'npm --version'
      },
      {
        id: 'init-project',
        description: 'Tạo thư mục dự án mới "my-node-app" và khởi tạo package.json.',
        commandHint: 'mkdir my-node-app && cd my-node-app && npm init -y',
        verify: async (vfs, cmd) => {
          try {
            const pwd = await vfs.pwd();
            if (!pwd.endsWith('/my-node-app')) return false;
            const items = await vfs.ls('.');
            return items.includes('package.json');
          } catch { return false; }
        }
      },
      {
        id: 'check-package-json',
        description: 'Xem nội dung tệp package.json vừa tạo.',
        commandHint: 'cat package.json',
        verify: async (vfs, cmd) => cmd.trim().startsWith('cat') && cmd.includes('package.json')
      },
      {
        id: 'install-dep',
        description: 'Cài đặt thư viện "express" làm dependency chính.',
        commandHint: 'npm install express',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('package.json');
            const pkg = JSON.parse(content);
            return pkg.dependencies && pkg.dependencies['express'];
          } catch { return false; }
        }
      },
      {
        id: 'check-node-modules',
        description: 'Kiểm tra thư mục node_modules để thấy express đã được tải về.',
        commandHint: 'ls node_modules',
        verify: async (vfs, cmd) => {
          try {
            const items = await vfs.ls('node_modules');
            return items.includes('express');
          } catch { return false; }
        }
      },
      {
        id: 'install-dev-dep',
        description: 'Cài đặt "jest" làm devDependency (công cụ hỗ trợ phát triển).',
        commandHint: 'npm install jest --save-dev',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('package.json');
            const pkg = JSON.parse(content);
            return pkg.devDependencies && pkg.devDependencies['jest'];
          } catch { return false; }
        }
      },
      {
        id: 'run-test',
        description: 'Chạy script "test" mặc định trong package.json.',
        commandHint: 'npm test',
        verify: async (vfs, cmd) => cmd.trim() === 'npm test' || cmd.trim() === 'npm run test'
      },
      {
        id: 'create-index',
        description: 'Tạo tệp index.js với nội dung in ra màn hình.',
        commandHint: 'echo "console.log(\'Hello Node.js\')" > index.js',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('index.js');
            return content.includes('console.log');
          } catch { return false; }
        }
      },
      {
        id: 'run-node',
        description: 'Chạy tệp index.js bằng Node.js.',
        commandHint: 'node index.js',
        verify: async (vfs, cmd) => cmd.trim().startsWith('node') && cmd.includes('index.js')
      }
    ]
  },
  {
    id: 'nano-editor',
    title: 'Trình Soạn Thảo Nano',
    description: 'Học cách chỉnh sửa văn bản trực tiếp trong terminal bằng trình soạn thảo Nano.',
    tasks: [
      {
        id: 'nano-open',
        description: 'Mở trình soạn thảo nano để tạo tệp "story.txt".',
        commandHint: 'nano story.txt',
        verify: async (vfs, cmd) => cmd.trim().startsWith('nano') && cmd.includes('story.txt')
      },
      {
        id: 'nano-content',
        description: 'Viết dòng chữ "Once upon a time" vào file và lưu lại (Ctrl+O). Sau đó thoát (Ctrl+X).',
        commandHint: '(Thực hiện trong editor)',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('story.txt');
            return content.includes('Once upon a time');
          } catch { return false; }
        }
      },
      {
        id: 'cat-story',
        description: 'Kiểm tra lại nội dung tệp story.txt vừa tạo.',
        commandHint: 'cat story.txt',
        verify: async (vfs, cmd) => cmd.trim().startsWith('cat') && cmd.includes('story.txt')
      },
      {
        id: 'nano-edit',
        description: 'Mở lại file story.txt bằng nano để chỉnh sửa.',
        commandHint: 'nano story.txt',
        verify: async (vfs, cmd) => cmd.trim().startsWith('nano') && cmd.includes('story.txt')
      },
      {
        id: 'nano-append',
        description: 'Thêm dòng "The End." vào cuối file, lưu và thoát.',
        commandHint: '(Thực hiện trong editor)',
        verify: async (vfs, cmd) => {
          try {
            const content = await vfs.cat('story.txt');
            return content.includes('Once upon a time') && content.includes('The End');
          } catch { return false; }
        }
      }
    ]
  },

  {
    id: 'process-management',
    title: 'Quản Lý Tiến Trình',
    description: 'Hiểu cách hệ điều hành quản lý các chương trình đang chạy (processes).',
    theory: `
### Bộ Não Của Hệ Điều Hành

Mỗi chương trình đang chạy được gọi là một **Tiến Trình (Process)**.
Hệ điều hành cấp cho mỗi tiến trình một ID duy nhất (**PID**).

**Quản lý:**
- **Foreground:** Chạy trực tiếp, chiếm dụng terminal.
- **Background (&):** Chạy ngầm, trả lại terminal cho bạn dùng việc khác.
- **Kill:** Dừng cưỡng bức một tiến trình bằng PID.
    `,
    tasks: [
      {
        id: 'create-server-file',
        description: 'Tạo một file server giả lập. Dùng lệnh: echo \'console.log("Server running...")\' > server.js',
        commandHint: 'echo \'console.log("Server running...")\' > server.js',
        verify: async (vfs, cmd) => (await vfs.exists('server.js'))
      },
      {
        id: 'run-background',
        description: 'Chạy file server.js dưới nền (background) bằng cách thêm dấu & vào cuối lệnh.',
        commandHint: 'node server.js &',
        verify: async (vfs, cmd) => cmd.includes('node') && cmd.includes('&')
      },
      {
        id: 'check-process',
        description: 'Kiểm tra danh sách các tiến trình đang chạy để tìm PID của server.js.',
        commandHint: 'ps',
        verify: async (vfs, cmd) => cmd.trim() === 'ps'
      },
      {
        id: 'monitor-top',
        description: 'Mở giao diện theo dõi tài nguyên hệ thống (RAM/CPU). Nhấn "q" để thoát.',
        commandHint: 'top',
        verify: async (vfs, cmd) => cmd.trim() === 'top'
      },
      {
        id: 'kill-process',
        description: 'Dùng lệnh kill để dừng tiến trình server.js. Thay <PID> bằng số PID bạn thấy ở lệnh ps.',
        commandHint: 'kill <PID>',
        verify: async (vfs, cmd) => cmd.includes('kill')
      }
    ]
  }
];
