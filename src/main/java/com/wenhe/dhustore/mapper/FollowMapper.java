package com.wenhe.dhustore.mapper;

import com.wenhe.dhustore.dto.FollowUserVO;
import com.wenhe.dhustore.entity.Follow;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface FollowMapper {

    int insert(Follow follow);

    int delete(@Param("followerId") Long followerId, @Param("followeeId") Long followeeId);

    /** 是否已关注：返回 1/0 */
    int countRelation(@Param("followerId") Long followerId, @Param("followeeId") Long followeeId);

    /** 我关注了多少人 */
    long countFollowing(@Param("userId") Long userId);

    /** 我多少粉丝 */
    long countFollowers(@Param("userId") Long userId);

    /** 我关注的人（对方是否回关用 mutual 表示） */
    List<FollowUserVO> findFollowing(@Param("userId") Long userId,
                                     @Param("offset") int offset,
                                     @Param("size") int size);

    /** 关注我的人（我是否已回关用 mutual 表示） */
    List<FollowUserVO> findFollowers(@Param("userId") Long userId,
                                     @Param("offset") int offset,
                                     @Param("size") int size);
}
