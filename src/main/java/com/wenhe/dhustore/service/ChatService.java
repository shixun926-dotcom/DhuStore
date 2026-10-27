package com.wenhe.dhustore.service;

import com.wenhe.dhustore.common.BusinessException;
import com.wenhe.dhustore.common.ResultCode;
import com.wenhe.dhustore.dto.ConversationVO;
import com.wenhe.dhustore.dto.MessageVO;
import com.wenhe.dhustore.dto.SendMessageRequest;
import com.wenhe.dhustore.entity.Conversation;
import com.wenhe.dhustore.entity.Message;
import com.wenhe.dhustore.entity.User;
import com.wenhe.dhustore.mapper.ConversationMapper;
import com.wenhe.dhustore.mapper.MessageMapper;
import com.wenhe.dhustore.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 私信：会话创建 / 列表 / 历史与增量消息 / 发送 / 已读 / 未读总数。
 *
 * 一致性约定：
 * · 消息落库是唯一事实源，WebSocket 只在落库成功后做投递加速；
 * · 所有 /conversations/{id}/** 操作都先在 requireConversation 里校验「我是否是会话参与者」。
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    /** 图片消息只允许站内上传产物：本地 /uploads/ 或本桶 OSS 域名 */
    private static final Pattern ALLOWED_IMAGE =
            Pattern.compile("^(/uploads/|https://[A-Za-z0-9.-]*aliyuncs\\.com/)", Pattern.CASE_INSENSITIVE);

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final UserMapper userMapper;
    private final ObjectProvider<ChatNotifier> notifierProvider;

    /** 会话列表：按最近活跃排序，图片消息摘要统一显示 [图片] */
    public List<ConversationVO> conversations(Long meId) {
        List<ConversationVO> list = conversationMapper.findByUser(meId);
        for (ConversationVO vo : list) {
            vo.setLastContent(summary(vo.getLastType(), vo.getLastContent()));
        }
        return list;
    }

    /** 打开与某人的会话：不存在则创建，存在则直接返回（幂等） */
    @Transactional
    public ConversationVO start(Long meId, Long targetId) {
        if (targetId == null || meId.equals(targetId)) {
            throw new BusinessException(ResultCode.MESSAGE_TO_SELF);
        }
        User target = userMapper.findById(targetId);
        if (target == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        long u1 = Math.min(meId, targetId);
        long u2 = Math.max(meId, targetId);
        Conversation conversation = conversationMapper.findByPair(u1, u2);
        if (conversation == null) {
            Conversation created = new Conversation();
            created.setUser1Id(u1);
            created.setUser2Id(u2);
            try {
                conversationMapper.insert(created);
                conversation = created;
            } catch (DuplicateKeyException e) {
                // 并发创建撞唯一键，回查已存在的那条
                conversation = conversationMapper.findByPair(u1, u2);
            }
        }
        if (conversation == null) {
            throw new BusinessException(ResultCode.SERVER_ERROR);
        }
        ConversationVO vo = conversationMapper.findVoById(conversation.getId(), meId);
        if (vo != null) {
            vo.setLastContent(summary(vo.getLastType(), vo.getLastContent()));
        }
        return vo;
    }

    /** 历史消息：取 beforeId 之前的 size 条，返回时按时间升序 */
    public List<MessageVO> messages(Long meId, Long conversationId, Long beforeId, int size) {
        requireConversation(conversationId, meId);
        int limit = Math.min(Math.max(size, 1), 100);
        List<Message> rows = messageMapper.findBefore(conversationId, beforeId, limit);
        Collections.reverse(rows);
        return toVOs(rows, meId);
    }

    /** 增量消息：afterId 之后的全部，用于断线重连与降级轮询 */
    public List<MessageVO> messagesAfter(Long meId, Long conversationId, Long afterId) {
        requireConversation(conversationId, meId);
        return toVOs(messageMapper.findAfter(conversationId, afterId == null ? 0L : afterId), meId);
    }

    /** 发送消息：落库 → 更新会话最后消息 → 推送接收方 */
    @Transactional
    public MessageVO send(Long meId, Long conversationId, SendMessageRequest req) {
        Conversation conversation = requireConversation(conversationId, meId);
        int type = req.getType() == null ? Message.TYPE_TEXT : req.getType();
        if (type != Message.TYPE_TEXT && type != Message.TYPE_IMAGE) {
            throw new BusinessException(ResultCode.MESSAGE_TYPE_ERROR);
        }
        String content = req.getContent() == null ? "" : req.getContent().trim();
        if (content.isEmpty()) {
            throw new BusinessException(ResultCode.MESSAGE_EMPTY);
        }
        if (type == Message.TYPE_IMAGE && !ALLOWED_IMAGE.matcher(content).find()) {
            throw new BusinessException(ResultCode.MESSAGE_IMAGE_INVALID);
        }
        if (content.length() > 1000) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "消息内容不能超过 1000 字");
        }

        Long peerId = peerOf(conversation, meId);
        Message message = new Message();
        message.setConversationId(conversationId);
        message.setSenderId(meId);
        message.setReceiverId(peerId);
        message.setType(type);
        message.setContent(content);
        message.setIsRead(0);
        messageMapper.insert(message);

        conversationMapper.updateLastMessage(conversationId, message.getId());

        /* create_time 由数据库默认值生成，回查一次拿到完整行再回传 */
        Message saved = messageMapper.findById(message.getId());
        MessageVO vo = toVO(saved == null ? message : saved, meId);
        ChatNotifier notifier = notifierProvider.getIfAvailable();
        if (notifier != null) {
            notifier.messageCreated(vo, peerId);
        }
        return vo;
    }

    /** 把该会话中发给我的消息标记为已读 */
    @Transactional
    public long markRead(Long meId, Long conversationId) {
        requireConversation(conversationId, meId);
        messageMapper.markRead(conversationId, meId);
        long unread = messageMapper.countUnread(meId);
        ChatNotifier notifier = notifierProvider.getIfAvailable();
        if (notifier != null) {
            notifier.unreadChanged(meId, unread);
        }
        return unread;
    }

    public long unreadCount(Long meId) {
        return messageMapper.countUnread(meId);
    }

    /* --------------------------------------------------------- 内部 */

    private Conversation requireConversation(Long conversationId, Long meId) {
        if (meId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        Conversation conversation = conversationId == null ? null : conversationMapper.findById(conversationId);
        // 不存在与无权访问返回同一错误，避免用 id 探测他人会话是否存在
        if (conversation == null
                || (!meId.equals(conversation.getUser1Id()) && !meId.equals(conversation.getUser2Id()))) {
            throw new BusinessException(ResultCode.CONVERSATION_NOT_FOUND);
        }
        return conversation;
    }

    private Long peerOf(Conversation conversation, Long meId) {
        return meId.equals(conversation.getUser1Id()) ? conversation.getUser2Id() : conversation.getUser1Id();
    }

    private List<MessageVO> toVOs(List<Message> rows, Long meId) {
        return rows.stream().map(m -> toVO(m, meId)).collect(Collectors.toList());
    }

    private MessageVO toVO(Message m, Long meId) {
        MessageVO vo = new MessageVO();
        vo.setId(m.getId());
        vo.setConversationId(m.getConversationId());
        vo.setSenderId(m.getSenderId());
        vo.setReceiverId(m.getReceiverId());
        vo.setType(m.getType());
        vo.setContent(m.getContent());
        vo.setRead(m.getIsRead() != null && m.getIsRead() == 1);
        vo.setMine(meId != null && meId.equals(m.getSenderId()));
        vo.setCreateTime(m.getCreateTime());
        return vo;
    }

    private String summary(Integer type, String content) {
        if (content == null) {
            return "";
        }
        return type != null && type == Message.TYPE_IMAGE ? "[图片]" : content;
    }
}
