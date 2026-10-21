package com.wenhe.dhustore.service;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * 图片存储：配置了阿里云 OSS 时上传到 OSS，否则落到本地磁盘（由 /uploads/** 静态映射提供访问）。
 * 安全措施：大小校验 → 扩展名校验 → Content-Type 校验 → UUID 重命名。
 */
@Slf4j
@Service
public class FileStorageService {

    private static final long MAX_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_CONTENT_TYPE =
            Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");

    @Value("${storage.type:local}")
    private String storageType;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${file.public-prefix:/uploads}")
    private String publicPrefix;

    @Value("${aliyun.oss.endpoint:}")
    private String endpoint;

    @Value("${aliyun.oss.access-key-id:}")
    private String accessKeyId;

    @Value("${aliyun.oss.access-key-secret:}")
    private String accessKeySecret;

    @Value("${aliyun.oss.bucket:}")
    private String bucket;

    @Value("${aliyun.oss.dir-prefix:product}")
    private String dirPrefix;

    private volatile OSS ossClient;

    /** 保存图片并返回可访问 URL */
    public String store(MultipartFile file) {
        validate(file);

        String ext = extensionOf(file.getOriginalFilename());
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String objectKey = dirPrefix + "/" + datePath + "/" + UUID.randomUUID().toString().replace("-", "") + "." + ext;

        if (useOss()) {
            return uploadToOss(file, objectKey);
        }
        return saveToLocal(file, objectKey);
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.IMAGE_COUNT_ERROR.getCode(), "请选择要上传的图片");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BusinessException(ResultCode.FILE_TOO_LARGE);
        }
        String ext = extensionOf(file.getOriginalFilename());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new BusinessException(ResultCode.FILE_TYPE_NOT_ALLOWED);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPE.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BusinessException(ResultCode.FILE_TYPE_NOT_ALLOWED);
        }
    }

    private boolean useOss() {
        return "oss".equalsIgnoreCase(storageType) && bucket != null && !bucket.isBlank()
                && endpoint != null && !endpoint.isBlank();
    }

    private String uploadToOss(MultipartFile file, String objectKey) {
        if (accessKeyId == null || accessKeyId.isBlank()
                || accessKeySecret == null || accessKeySecret.isBlank()) {
            throw new BusinessException(ResultCode.OSS_NOT_CONFIGURED);
        }
        try (InputStream in = file.getInputStream()) {
            ObjectMetadata meta = new ObjectMetadata();
            meta.setContentType(file.getContentType());
            meta.setContentLength(file.getSize());
            client().putObject(bucket, objectKey, in, meta);

            String host = endpoint.replaceFirst("^https?://", "").replaceAll("/+$", "");
            return "https://" + bucket + "." + host + "/" + objectKey;
        } catch (Exception e) {
            log.error("OSS 上传失败: {}", objectKey, e);
            throw new BusinessException(ResultCode.UPLOAD_FAILED);
        }
    }

    private String saveToLocal(MultipartFile file, String objectKey) {
        try {
            Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path target = root.resolve(objectKey).normalize();
            if (!target.startsWith(root)) {
                throw new BusinessException(ResultCode.FILE_TYPE_NOT_ALLOWED);
            }
            Files.createDirectories(target.getParent());
            file.transferTo(target);
            return publicPrefix + "/" + objectKey;
        } catch (IOException e) {
            log.error("本地保存图片失败: {}", objectKey, e);
            throw new BusinessException(ResultCode.UPLOAD_FAILED);
        }
    }

    private OSS client() {
        if (ossClient == null) {
            synchronized (this) {
                if (ossClient == null) {
                    String ep = endpoint.trim();
                    if (!ep.startsWith("http://") && !ep.startsWith("https://")) {
                        ep = "https://" + ep;
                    }
                    ossClient = new OSSClientBuilder().build(ep, accessKeyId, accessKeySecret);
                }
            }
        }
        return ossClient;
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int i = filename.lastIndexOf('.');
        if (i < 0 || i == filename.length() - 1) {
            return "";
        }
        return filename.substring(i + 1).toLowerCase(Locale.ROOT);
    }
}
