package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.entity.Message;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface MessageMapper {

    int insert(Message message);

    Message findById(@Param("id") Long id);

    /** 历史消息：取 id 小于 beforeId 的最近 size 条（倒序返回，前端自行反转） */
    List<Message> findBefore(@Param("conversationId") Long conversationId,
                             @Param("beforeId") Long beforeId,
                             @Param("size") int size);

    /** 增量消息：取 id 大于 afterId 的全部（按 id 升序），用于断线重连与降级轮询 */
    List<Message> findAfter(@Param("conversationId") Long conversationId,
                            @Param("afterId") Long afterId);

    /** 把某会话中发给我的未读消息标记为已读 */
    int markRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    /** 我的未读消息总数（角标） */
    long countUnread(@Param("userId") Long userId);
}
