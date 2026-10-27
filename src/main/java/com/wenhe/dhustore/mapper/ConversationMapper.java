package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.dto.ConversationVO;
import com.wenhe.dhustore.entity.Conversation;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ConversationMapper {

    /** 按归一化后的用户对查找（user1Id 恒小于 user2Id） */
    Conversation findByPair(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    Conversation findById(@Param("id") Long id);

    int insert(Conversation conversation);

    int updateLastMessage(@Param("id") Long id, @Param("lastMessageId") Long lastMessageId);

    /** 我的会话列表：对方资料 + 最后一条消息 + 我的未读数，按最近活跃排序 */
    List<ConversationVO> findByUser(@Param("userId") Long userId);

    /** 单个会话的展示对象（创建会话后回传，避免前端再查一次列表） */
    ConversationVO findVoById(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}
