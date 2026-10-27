package com.wenhe.dhustore.controller;

import com.wenhe.dhustore.annotation.RequireLogin;
import com.wenhe.dhustore.common.Result;
import com.wenhe.dhustore.dto.ConversationVO;
import com.wenhe.dhustore.dto.MessageVO;
import com.wenhe.dhustore.dto.SendMessageRequest;
import com.wenhe.dhustore.dto.StartConversationRequest;
import com.wenhe.dhustore.service.ChatService;
import com.wenhe.dhustore.util.UserContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 私信接口。会话内所有操作都在 Service 层校验「我是否是参与者」。
 * 实时通道为 /ws/chat，这里的 REST 只负责落库与读取，断线时前端用 afterId 增量补齐。
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    @RequireLogin
    public Result<List<ConversationVO>> conversations() {
        return Result.success(chatService.conversations(UserContext.getUserId()));
    }

    /** 打开与某人的会话（幂等）：有则返回，无则创建 */
    @PostMapping("/conversations")
    @RequireLogin
    public Result<ConversationVO> start(@Valid @RequestBody StartConversationRequest req) {
        return Result.success(chatService.start(UserContext.getUserId(), req.getUserId()));
    }

    /** 历史消息：beforeId 为空时取最新一页；afterId 非空时改为增量拉取 */
    @GetMapping("/conversations/{id}/messages")
    @RequireLogin
    public Result<List<MessageVO>> messages(
            @PathVariable Long id,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(required = false) Long afterId,
            @RequestParam(defaultValue = "30") int size) {
        Long me = UserContext.getUserId();
        if (afterId != null) {
            return Result.success(chatService.messagesAfter(me, id, afterId));
        }
        return Result.success(chatService.messages(me, id, beforeId, size));
    }

    @PostMapping("/conversations/{id}/messages")
    @RequireLogin
    public Result<MessageVO> send(@PathVariable Long id, @Valid @RequestBody SendMessageRequest req) {
        return Result.success(chatService.send(UserContext.getUserId(), id, req));
    }

    /** 标记会话已读，返回我的未读总数，便于前端直接刷新角标 */
    @PostMapping("/conversations/{id}/read")
    @RequireLogin
    public Result<Map<String, Long>> read(@PathVariable Long id) {
        long unread = chatService.markRead(UserContext.getUserId(), id);
        return Result.success(Map.of("unread", unread));
    }

    @GetMapping("/messages/unread")
    @RequireLogin
    public Result<Map<String, Long>> unread() {
        return Result.success(Map.of("unread", chatService.unreadCount(UserContext.getUserId())));
    }
}
