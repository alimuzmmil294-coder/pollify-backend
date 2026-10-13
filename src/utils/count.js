import {Comment} from "../modals/comment.js";

async function countsFor(pollsIds) {
  if (!pollsIds.length) return { commentMap: {}, saveMap: {} };

  const [comments, saves] = await Promise.all([
    Comment.aggregate([
      { $match: { poll: { $in: pollIds } } },
      { $group: { _id: "$poll", n: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { bookmarks: { $in: pollIds } } },
      { $unwind: "$bookmarks" },
      { $match: { bookmarks: { $in: pollIds } } },
      { $group: { _id: "$bookmarks", n: { $sum: 1 } } },
    ]),
  ]);
  const commentMap = {};
  const saveMap = {};
  comments.forEach((c) => (commentMap[String(c._id)] = c.n));
  saves.forEach((s) => (saveMap[String(s._id)] = s.n));

  return {commentMap, saveMap};
}

export async function withCounts(shapePolls) {
    const {commentMap, saveMap} = await countsFor(
        shapePolls.map((p) => p._id)
    )
    return shapePolls.map((p) => (
        {
            ...p,
            comments:commentMap[String(p._id)] || 0,
            saves:saveMap[String(p._id)] || 0
        }
    ))
}
