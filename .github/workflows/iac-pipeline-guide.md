# Hướng dẫn chi tiết file `iac-pipeline.yml`

File này là workflow GitHub Actions CI/CD tự động build, push image backend/frontend lên GHCR (GitHub Container Registry) cho từng environment (dev, staging, prod).

---

## 1. Trigger (kích hoạt khi nào?)

```yaml
on:
  push:
    branches:
      - dev
      - staging
      - main
  workflow_dispatch:
    inputs:
      target_environment:
        description: "Target environment"
        type: choice
        required: true
        default: dev
        options:
          - dev
          - staging
          - prod
```
- **push**: Tự động chạy khi có commit lên branch `dev`, `staging`, hoặc `main`.
- **workflow_dispatch**: Cho phép chạy tay trên GitHub UI, chọn environment (dev/staging/prod).

---

## 2. Quyền (permissions)

```yaml
permissions:
  contents: read
  packages: write
```
- Cho phép workflow đọc code và push image lên GHCR.

---

## 3. Biến môi trường toàn cục

```yaml
env:
  REGISTRY: ghcr.io
```
- Đặt biến `REGISTRY` là địa chỉ registry container của GitHub.

---

## 4. Job `resolve` (tính toán biến cho pipeline)

```yaml
jobs:
  resolve:
    runs-on: ubuntu-latest
    outputs:
      target_env: ${{ steps.resolve.outputs.target_env }}
      image_tag: ${{ steps.resolve.outputs.image_tag }}
      backend_image: ${{ steps.resolve.outputs.backend_image }}
      frontend_image: ${{ steps.resolve.outputs.frontend_image }}
    steps:
      - id: resolve
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            TARGET_ENV="${{ inputs.target_environment }}"
          elif [ "${GITHUB_REF_NAME}" = "main" ]; then
            TARGET_ENV="prod"
          elif [ "${GITHUB_REF_NAME}" = "staging" ]; then
            TARGET_ENV="staging"
          else
            TARGET_ENV="dev"
          fi

          IMAGE_TAG="${GITHUB_SHA}"
          REPO_LOWER=$(echo "${{ github.repository }}" | tr '[:upper:]' '[:lower:]')

          echo "target_env=${TARGET_ENV}" >> "$GITHUB_OUTPUT"
          echo "image_tag=${IMAGE_TAG}" >> "$GITHUB_OUTPUT"
          echo "backend_image=${{ env.REGISTRY }}/${REPO_LOWER}-backend:${IMAGE_TAG}" >> "$GITHUB_OUTPUT"
          echo "frontend_image=${{ env.REGISTRY }}/${REPO_LOWER}-frontend:${IMAGE_TAG}" >> "$GITHUB_OUTPUT"
```
- **Mục đích:**
  - Xác định environment (dev/staging/prod) dựa vào branch hoặc input.
  - Tạo tag image là SHA commit.
  - Tạo tên image chuẩn cho backend/frontend.
- **Output:** Các biến này sẽ được job sau dùng lại.

---

## 5. Job `build` (build & push image)

```yaml
  build:
    needs: resolve
    runs-on: ubuntu-latest
    outputs:
      backend_image: ${{ needs.resolve.outputs.backend_image }}
      frontend_image: ${{ needs.resolve.outputs.frontend_image }}
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ${{ env.REGISTRY }} -u "${{ github.actor }}" --password-stdin

      - name: Build backend image
        run: |
          docker build -t "${{ needs.resolve.outputs.backend_image }}" ./backend

      - name: Build frontend image
        run: |
          docker build \
            --build-arg VITE_API_URL="${{ vars.PUBLIC_API_URL }}" \
            -t "${{ needs.resolve.outputs.frontend_image }}" \
            ./frontend

      - name: Push images
        run: |
          docker push "${{ needs.resolve.outputs.backend_image }}"
          docker push "${{ needs.resolve.outputs.frontend_image }}"
```
- **actions/checkout@v4**: Lấy code về runner.
- **Login to GHCR**: Đăng nhập registry bằng token GitHub Actions.
- **Build backend image**: Build Docker image backend, tag đúng chuẩn.
- **Build frontend image**: Build Docker image frontend, inject biến `VITE_API_URL` từ variable GitHub Actions (đã tạo bằng Terraform).
- **Push images**: Đẩy cả 2 image lên GHCR.

---

## 6. Các biến đặc biệt

| Biến | Nguồn | Ý nghĩa |
|---|---|---|
| `${{ github.event_name }}` | GitHub | Kiểu trigger (push, dispatch) |
| `${{ github.repository }}` | GitHub | Tên repo dạng `owner/repo` |
| `${{ github.actor }}` | GitHub | User thực thi workflow |
| `${{ github.ref_name }}` | GitHub | Tên branch/tag |
| `${{ inputs.target_environment }}` | Input | Environment chọn khi chạy tay |
| `${{ env.REGISTRY }}` | env | Địa chỉ registry container |
| `${{ steps.resolve.outputs.* }}` | Output step | Biến output của step resolve |
| `${{ needs.resolve.outputs.* }}` | Output job | Biến output của job resolve |
| `${{ secrets.GITHUB_TOKEN }}` | Secret | Token tạm thời để push image |
| `${{ vars.PUBLIC_API_URL }}` | Variable | URL backend, do Terraform tạo |

---

## 7. Tổng kết luồng hoạt động

1. Khi có commit lên branch dev/staging/main hoặc chạy tay, workflow được kích hoạt.
2. Job `resolve` xác định environment, tạo tag, chuẩn hóa tên image.
3. Job `build` checkout code, login GHCR, build image backend/frontend, inject biến API_URL, push image lên registry.
4. Image đã sẵn sàng để deploy ở các lab tiếp theo.

---

## 8. Lưu ý khi chỉnh sửa
- Không đổi tên biến output nếu không sửa cả chỗ dùng lại.
- Nếu đổi tên repo, cần xóa image cũ trên GHCR để tránh trùng tag.
- Nếu thêm biến môi trường mới cho build, phải thêm vào cả Terraform (Lab 03) và workflow này.

---

## 9. Kết quả trên GHCR (GitHub Container Registry)

Sau khi workflow chạy thành công, bạn sẽ thấy các image mới được tạo trên GHCR:

- Địa chỉ: https://github.com/users/<OWNER>/packages/container/<REPO>-backend
- Địa chỉ: https://github.com/users/<OWNER>/packages/container/<REPO>-frontend

Trong đó:
- `<OWNER>` là username hoặc organization của bạn
- `<REPO>` là tên repository (chữ thường)

### Cấu trúc image

| Image | Tag | Ý nghĩa |
|---|---|---|
| `<REPO>-backend` | SHA commit | Image backend Node.js, build từ thư mục `backend/` |
| `<REPO>-frontend` | SHA commit | Image frontend React, build từ thư mục `frontend/` |

- Mỗi lần pipeline chạy sẽ tạo image mới với tag là SHA commit tương ứng.
- Có thể có nhiều tag (nhiều commit) cho mỗi image.

### Cách kiểm tra

1. Vào GitHub → profile (hoặc org) → Packages
2. Chọn package `<REPO>-backend` hoặc `<REPO>-frontend`
3. Xem danh sách tag, thời gian tạo, dung lượng
4. Có thể copy lệnh `docker pull` để tải image về VPS:
   ```bash
   docker pull ghcr.io/<OWNER>/<REPO>-backend:<TAG>
   docker pull ghcr.io/<OWNER>/<REPO>-frontend:<TAG>
   ```

> Lưu ý: Chỉ những user có quyền repo mới pull được image nếu repo là private.
> Image này sẽ được dùng để deploy ở các lab tiếp theo (Lab 07).
