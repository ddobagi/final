import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ArrowLeft, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function firstSlugUi({ 
    loading, 
    video, 
    likes, 
    isOn, 
    replies, 
    myReplies, 
    userEmail, 
    previousPage, 
    handleLike, 
    handlePostReply, 
    handleReplyLike, 
    router, 
    essay, 
    isEditing, 
    setIsEditing, 
    isPosted, 
    handleTogglePost, 
    handleSaveEssay, 
    getYouTubeVideoID, 
}) {
  if (loading) return <p>로딩 중...</p>;

  return (
    <div className="flex flex-col items-center w-full p-6">
      <div className="w-full max-w-2xl flex justify-between">
        <button onClick={() => router.push(previousPage)} className="flex items-center mb-2">
          <ArrowLeft className="w-6 h-6 mr-2 cursor-pointer" />
        </button>
        <div className="flex items-center max-w-[600px] w-full h-10 space-x-2 justify-end">
          <p className="text-gray-500 text-sm font-pretendard">{getEmailUsername(userEmail)} 님</p>
          <p onClick={() => signOut(auth)} className="cursor-pointer text-gray-500 text-sm font-pretendard underline">로그아웃</p>
        </div>
      </div>

      {video && (
        <Card className="rounded-lg shadow-lg w-full max-w-2xl">
          <div className="relative w-full aspect-video">
            <iframe
              className="w-full h-full rounded-t-lg"
              src={`https://www.youtube.com/embed/${getYouTubeVideoID(video.video)}?autoplay=0&controls=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <CardContent className="p-4">
            <h1 className="text-xl font-bold mb-2">{video.title}</h1>
            <h3 className="text-lg font-bold mb-2">{video.name}</h3>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Image src={video.channelProfile} alt="Channel Profile" width={40} height={40} className="rounded-full mr-3" />
                <span className="text-lg font-semibold">{video.channel}</span>
              </div>
              <div className="flex items-center">
                <ThumbsUp className="w-5 h-5 text-gray-500 mr-1" />
                <span className="text-gray-600">{video.likes}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{video.views} views · {new Date(video.publishedAt).toLocaleDateString()}</p>
            
            {/* Essay 입력 및 수정 */}

            <div className="mt-4">
              <div className = "flex items-center justify-between">
                <h2 className="text-lg font-semibold font-nanum_pen">Essay</h2>

                {/* 🔥 isOn이 true일 때 좋아요 버튼 표시 */}
                {isOn && (
                  <button
                    className="flex items-center p-2 rounded-lg transition"
                    onClick={handleLike}
                  >
                    <Heart className="w-4 h-4 text-red-500 cursor-pointer" fill={liked ? "currentColor" : "none"} />
                    <span className="ml-2 text-lg font-semibold cursor-pointer">{likes}</span>
                  </button>
                )}
              </div>

              {/* 🔥 Essay 입력 또는 표시 */}
              {!isOn ? (
                isEditing ? (
                  <textarea
                    className="w-full p-2 border rounded mt-2 font-nanum_pen"
                    value={essay}
                    onChange={(e) => setEssay(e.target.value)}
                  />
                ) : (
                  <p className="mt-2 p-2 border rounded bg-gray-100 font-nanum_pen">
                    {essay || "작성된 내용이 없습니다."}
                  </p>
                )
              ) : (
                <p className="mt-2 p-2 border rounded bg-gray-100 font-nanum_pen">
                  {essay || "작성된 내용이 없습니다."}
                </p>
              )}

              {/* 🔥 isOn이 false일 때만 버튼 표시 */}
              {!isOn && (
                <div className="flex mt-2 space-x-2 font-pretendard justify-end">
                  {isEditing ? (
                    <Button onClick={handleSaveEssay}>저장</Button>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>수정</Button>
                  )}
                  <Button onClick={handleTogglePost} className="bg-blue-500 text-white">
                    {isPosted ? "게시 취소" : "게시"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🚨 답글 기능 🚨 🔥 답글 기능 (isOn이 true일 때만 활성화) */}
      {isOn && (
        <div className="mt-4">
          <Button onClick={() => setReplying(!replying)} className="w-full">
            {replying ? "나중에 보태기" : "낭만 보태기"}
          </Button>

          {replying && (
            <div className="mt-3 p-3 border rounded-lg bg-gray-50">
              <input
                type="text"
                placeholder="Youtube URL"
                className="w-full p-2 border rounded"
                value={replyVideoUrl}
                onChange={(e) => setReplyVideoUrl(e.target.value)}
              />
              <textarea
                placeholder="Essay"
                className="w-full mt-2 p-2 border rounded"
                value={replyEssay}
                onChange={(e) => setReplyEssay(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Button onClick={handlePostReply} className="bg-blue-500 text-white">
                  답글 등록
                </Button>
              </div>
            </div>
          )}

          {/* 🔥 작성 중이던 리스트 표시 */}
          {sortedMyReplies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">작성 중인 댓글 목록</h3>
              {sortedMyReplies.map((reply) => (
                <Card key={reply.id} className="mt-3 w-full max-w-2xl">
                  <Link key={reply.id} href={`/dashboard/${firstSlug}/${reply.id}`} passHref>
                    <div className="relative w-full aspect-video">
                      <iframe
                        className="w-full h-full rounded-t-lg"
                        src={`https://www.youtube.com/embed/${reply.videoId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link key={reply.id} href={`/dashboard/${firstSlug}/${reply.id}`} passHref>
                      <h3 className="text-lg font-bold mb-2">{reply.name}</h3>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <Image src={reply.channelProfile} alt="Channel Profile" width={40} height={40} className="rounded-full mr-3" />
                          <span className="text-lg font-semibold">{reply.channel}</span>
                        </div>
                        <div className="flex items-center">
                          <ThumbsUp className="w-5 h-5 text-gray-500 mr-1" />
                          <span className="text-gray-600">{reply.likes}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{reply.views} views · {new Date(reply.publishedAt).toLocaleDateString()}</p>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}



          {/* 🔥 기존 답글 리스트 표시 */}
          {sortedReplies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">전체 댓글 목록</h3>
              {sortedReplies.map((reply) => (
                <Card key={reply.id} className="mt-3 w-full max-w-2xl">
                  <Link key={reply.id} href={`/dashboard/${firstSlug}/${reply.id}`} passHref>
                    <div className="relative w-full aspect-video">
                      <iframe
                        className="w-full h-full rounded-t-lg"
                        src={`https://www.youtube.com/embed/${reply.videoId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link key={reply.id} href={`/dashboard/${firstSlug}/${reply.id}`} passHref>
                      <h3 className="text-lg font-bold mb-2">{reply.name}</h3>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <Image src={reply.channelProfile} alt="Channel Profile" width={40} height={40} className="rounded-full mr-3" />
                          <span className="text-lg font-semibold">{reply.channel}</span>
                        </div>
                        <div className="flex items-center">
                          <ThumbsUp className="w-5 h-5 text-gray-500 mr-1" />
                          <span className="text-gray-600">{reply.likes}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{reply.views} views · {new Date(reply.publishedAt).toLocaleDateString()}</p>
                    </Link>
                    {/* 🔥 답글 좋아요 버튼 */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        { isOn && (
                            <button
                            className="flex items-center p-2 rounded-lg transition"
                            onClick={() => handleReplyLike(reply.id)}
                          >
                            <Heart
                              className="w-4 h-4 text-red-500 cursor-pointer"
                              fill={reply.liked ? "currentColor" : "none"}
                            />
                            <span className="ml-2 text-lg font-semibold cursor-pointer">{reply.recommend}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}