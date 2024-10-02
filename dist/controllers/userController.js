"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityFeed = exports.getUserPosts = exports.getAllPosts = exports.cancelFriendRequest = exports.commentOnPost = exports.likePost = exports.deletePost = exports.updatePost = exports.createPost = exports.respondToFriendRequest = exports.sendFriendRequest = void 0;
const db_1 = __importDefault(require("../db/db"));
const sendFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { receiverId } = req.body;
    const senderId = req.user.id;
    try {
        const friendRequest = yield db_1.default.friendRequest.create({
            data: {
                senderId,
                receiverId,
                status: 'PENDING'
            }
        });
        res.status(201).json(friendRequest);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to send friend request' });
    }
});
exports.sendFriendRequest = sendFriendRequest;
const respondToFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { requestId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    try {
        const updatedRequest = yield db_1.default.friendRequest.update({
            where: { id: parseInt(requestId), receiverId: userId },
            data: { status }
        });
        res.status(200).json(updatedRequest);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to respond to friend request' });
    }
});
exports.respondToFriendRequest = respondToFriendRequest;
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { content } = req.body;
    const userId = req.user.id;
    try {
        const post = yield db_1.default.post.create({
            data: { content, userId: userId }
        });
        yield logActivity(userId, `Created post: ${post.id}`, 'POST_CREATED');
        res.status(201).json(post);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create post' });
    }
});
exports.createPost = createPost;
const updatePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    try {
        const post = yield db_1.default.post.update({
            where: { id: parseInt(postId), userId: userId },
            data: { content }
        });
        res.status(200).json(post);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update post' });
    }
});
exports.updatePost = updatePost;
const deletePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const userId = req.user.id;
    try {
        yield db_1.default.post.delete({
            where: { id: parseInt(postId), userId: userId }
        });
        yield db_1.default.activityLog.deleteMany({
            where: {
                userId: userId,
                action: `Created post: ${postId}`
            }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to delete post' });
    }
});
exports.deletePost = deletePost;
const likePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const userId = req.user.id;
    try {
        const like = yield db_1.default.like.create({
            data: { postId: parseInt(postId), userId }
        });
        res.status(201).json(like);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to like post' });
    }
});
exports.likePost = likePost;
const commentOnPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    try {
        const comment = yield db_1.default.comment.create({
            data: { content, postId: parseInt(postId), userId: userId }
        });
        yield logActivity(userId, `Commented on post: ${postId}`, 'COMMENT_ADDED');
        res.status(201).json(comment);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to comment on post' });
    }
});
exports.commentOnPost = commentOnPost;
const cancelFriendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { requestId } = req.params;
    const userId = req.user.id;
    try {
        const friendRequest = yield db_1.default.friendRequest.findUnique({
            where: { id: parseInt(requestId) }
        });
        if (!friendRequest) {
            return res.status(404).json({ error: 'Friend request not found' });
        }
        if (friendRequest.senderId !== userId) {
            return res.status(403).json({ error: 'Not authorized to cancel this request' });
        }
        yield db_1.default.friendRequest.delete({
            where: { id: parseInt(requestId) }
        });
        res.status(200).json({ message: 'Friend request cancelled successfully' });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to cancel friend request' });
    }
});
exports.cancelFriendRequest = cancelFriendRequest;
const getAllPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try {
        const [posts, totalCount] = yield db_1.default.$transaction([
            db_1.default.post.findMany({
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
            db_1.default.post.count()
        ]);
        const totalPages = Math.ceil(totalCount / limit);
        res.status(200).json({
            posts,
            currentPage: page,
            totalPages,
            totalPosts: totalCount
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});
exports.getAllPosts = getAllPosts;
const getUserPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.params;
    try {
        const posts = yield db_1.default.post.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user posts' });
    }
});
exports.getUserPosts = getUserPosts;
function logActivity(userId, action, category) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db_1.default.activityLog.create({
            data: {
                userId,
                action,
                category
            }
        });
    });
}
const getActivityFeed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    try {
        const [activities, totalCount] = yield db_1.default.$transaction([
            db_1.default.activityLog.findMany({
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
            db_1.default.activityLog.count({
                where: {
                    userId: userId,
                    category: {
                        in: ['POST_CREATED', 'COMMENT_ADDED']
                    }
                }
            })
        ]);
        const activitiesWithPostContent = yield Promise.all(activities.map((activity) => __awaiter(void 0, void 0, void 0, function* () {
            if (activity.category === 'POST_CREATED') {
                const postId = parseInt(activity.action.split(': ')[1]);
                const post = yield db_1.default.post.findUnique({
                    where: { id: postId },
                    select: { content: true }
                });
                return Object.assign(Object.assign({}, activity), { postContent: post === null || post === void 0 ? void 0 : post.content });
            }
            return activity;
        })));
        const totalPages = Math.ceil(totalCount / limit);
        res.status(200).json({
            activities: activitiesWithPostContent,
            currentPage: page,
            totalPages,
            totalActivities: totalCount
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
});
exports.getActivityFeed = getActivityFeed;
