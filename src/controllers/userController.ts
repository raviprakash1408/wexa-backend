import { Request, Response } from 'express';
import { ActivityCategory } from '@prisma/client';
import prisma from '../db/db';

export const sendFriendRequest = async (req: Request, res: Response) => {
  const { receiverId } = req.body;
  const senderId = req.user!.id;

  try {
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING'
      }
    });
    res.status(201).json(friendRequest);
  } catch (error) {
    res.status(400).json({ error: 'Failed to send friend request' });
  }
};

export const respondToFriendRequest = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const userId = req.user!.id;

  try {
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: parseInt(requestId), receiverId: userId },
      data: { status }
    });
    res.status(200).json(updatedRequest);
  } catch (error) {
    res.status(400).json({ error: 'Failed to respond to friend request' });
  }
};

export const createPost = async (req: Request, res: Response) => {
  const { content } = req.body;
  const userId = req.user!.id;

  try {
    const post = await prisma.post.create({
      data: { content, userId: userId }
    });
    await logActivity(userId, `Created post: ${post.id}`, 'POST_CREATED');
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create post' });
  }
};


export const updatePost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  try {
    const post = await prisma.post.update({
      where: { id: parseInt(postId), userId: userId },
      data: { content }
    });
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update post' });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user!.id;

  try {
    await prisma.post.delete({
      where: { id: parseInt(postId), userId: userId }
    });
    await prisma.activityLog.deleteMany({
      where: {
        userId: userId,
        action: `Created post: ${postId}`
      }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete post' });
  }
};


export const likePost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user!.id;

  try {
    const like = await prisma.like.create({
      data: { postId: parseInt(postId), userId }
    });
    res.status(201).json(like);
  } catch (error) {
    res.status(400).json({ error: 'Failed to like post' });
  }
};

export const commentOnPost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  try {
    const comment = await prisma.comment.create({
      data: { content, postId: parseInt(postId), userId: userId }
    });
    await logActivity(userId, `Commented on post: ${postId}`, 'COMMENT_ADDED');
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to comment on post' });
  }
};


export const cancelFriendRequest = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const userId = req.user!.id;

  try {
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: parseInt(requestId) }
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendRequest.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this request' });
    }

    await prisma.friendRequest.delete({
      where: { id: parseInt(requestId) }
    });

    res.status(200).json({ message: 'Friend request cancelled successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to cancel friend request' });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const [posts, totalCount] = await prisma.$transaction([
      prisma.post.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          comments: true,
          likes: true
        },
        skip,
        take: limit
      }),
      prisma.post.count()
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      posts,
      currentPage: page,
      totalPages,
      totalPosts: totalCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};


export const getUserPosts = async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    const posts = await prisma.post.findMany({
      where: {
        user: {
          username: username
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        comments: true,
        likes: true
      }
    });
    
    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found for this user' });
    }

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
};

async function logActivity(userId: number, action: string, category: ActivityCategory) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      category
    }
  });
}

export const getActivityFeed = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const [activities, totalCount] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: {
          userId: userId,
          category: {
            in: ['POST_CREATED', 'COMMENT_ADDED']
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        }
      }),
      prisma.activityLog.count({
        where: {
          userId: userId,
          category: {
            in: ['POST_CREATED', 'COMMENT_ADDED']
          }
        }
      })
    ]);

    const activitiesWithPostContent = await Promise.all(
      activities.map(async (activity) => {
        if (activity.category === 'POST_CREATED') {
          const postId = parseInt(activity.action.split(': ')[1]);
          const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { content: true }
          });
          return { ...activity, postContent: post?.content };
        }
        return activity;
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      activities: activitiesWithPostContent,
      currentPage: page,
      totalPages,
      totalActivities: totalCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
};








