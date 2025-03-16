// useState, useEffect 등 react hook은 클라이언트 사이드에서만 실행되므로, 클라이언트 컴포넌트임을 선언하는 것 
"use client";

// react hook
import { useEffect, useState } from "react";

// next.js 
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// firebase 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, deleteDoc, writeBatch, setDoc, increment} from "firebase/firestore";

// shadcn
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// lucide-react 
import { ThumbsUp, ArrowLeft, Heart } from "lucide-react";

// export default: 다른 곳에서 import 할 수 있게 함
// 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function FirstSlugPage() {

  // URL에서 slug 가져오기
  const { firstSlug } = useParams(); 

  // useRouter(): 페이지 이동을 관리하는 hook 
  const router = useRouter();

  // useState() : react에서 상태를 관리하는 hook 
  // state 정보와 setter 함수가 배열[]로 정의됨 

  // user info 
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [isOn, setIsOn] = useState(true);

  // video info 
  const [video, setVideo] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(1);
  const [isPosted, setIsPosted] = useState(false);

  // essay info 
  const [essay, setEssay] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // previousPage & error 
  const [previousPage, setPreviousPage] = useState("/dashboard");
  const [error, setError] = useState(null);

  // 댓글 
  const [replying, setReplying] = useState(false); // 답글 입력 UI 활성화 여부
  const [replyVideoUrl, setReplyVideoUrl] = useState(""); // 답글 비디오 URL
  const [replyEssay, setReplyEssay] = useState(""); // 답글 에세이 내용
  const [allReplies, setAllReplies] = useState([]); // 전체 댓글 목록
  const [myReplies, setMyReplies] = useState([]); // 작성 중인 댓글 목록
  const [replyLiked, setReplyLiked] = useState(false);
  const [replyLikes, setReplyLikes] = useState(1);

  // vercel 환경 변수로 저장해둔 youtube api key
  // 반드시 "NEXT_PUBLIC_~"가 붙어야 함 
  const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  // 🚗🌴 페이지가 렌더링 되었을 때, user&slug 정보를 바탕으로 fetchVideoData 함수를 실행하는 useEffect 
  useEffect(() => {
    setPreviousPage(
      document.referrer.includes("/dashboard/likes") ? "/dashboard/likes" : "/dashboard"
    );

    // onAuthStateChanged(auth, callback): 사용자의 로그인 상태 변경을 감지하는 firebase authentication의 이벤트 리스너 
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

        // 현재 사용자와 현재 사용자의 이메일을, 각각 user와 userEmail로 설정 
        if (currentUser) {
            setUser(currentUser);
            setUserEmail(currentUser.email);
            console.log("사용자 이메일:", currentUser.email, "firstSlug:", firstSlug);

            try {
                // 현재 user 정보를 가져옴 
                const userDocRef = doc(db, "users", currentUser.uid); 
                const userDocSnap = await getDoc(userDocRef);

                // 해당 문서 Mode 필드의 값이 public이면 mode = true, 아니면 mode = false
                // isOn 값도 mode 값에 따라 변경 
                const userData = userDocSnap.exists() ? userDocSnap.data() : {};
                const mode = userData.Mode === "public";
                setIsOn(mode);

                // 현재 페이지의 slug 값과 mode 값에 알맞게 fetchVideoData 함수 실행 
                await fetchVideoData(firstSlug, mode);
            } catch (error) {
                console.error("사용자 Mode 데이터를 가져오는 중 오류 발생:", error);
                await fetchVideoData(firstSlug, false);
            }
        } else {
            router.push("/");
            return;
        }
    });

    // '컴포넌트가 rendering 되면, 정의한 unsubscribe 함수를 return하세요'인 것 + 이벤트 리스너 해제 
    return () => unsubscribe();
  
  // 의존성 배열에 slug와 router 포함 -> slug 값이 변경될 때마다 & router 값이 변경될 때마다 실행
  }, [firstSlug, router]);

  // 🚗🌴 전체 댓글 or 작성 중인 댓글 목록을 불러오는 useEffect 
  useEffect(() => {
    if (!isOn) return;

    const fetchReplies = async () => {
      try {
        const repliesRef = collection(db, "gallery", firstSlug, "comment");
          
        // ✅ Firestore 쿼리 적용 (isPosted가 true인 것만 가져오기)
        const allRepliesQuery = query(repliesRef, where("isPosted", "==", true));
        const myRepliesQuery = query(repliesRef, where("isPosted", "==", false), where("user", "==", userEmail));

        // ✅ 쿼리 실행
        const [allRepliesSnapshot, myRepliesSnapshot] = await Promise.all([
          getDocs(allRepliesQuery),
          getDocs(myRepliesQuery)
        ]);
  
        const allRepliesList = allRepliesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            likes: data.likes,
            recommend: data.recommend
          };
        });

        const myRepliesList = myRepliesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            likes: data.likes,
            recommend: data.recommend
          };
        });
  
        setAllReplies(allRepliesList);
        setMyReplies(myRepliesList);
      } catch (error) {
        console.error("🔥 답글을 가져오는 중 오류 발생: ", error);
      }
    };
  
    fetchReplies();
  }, [firstSlug, isOn, userEmail]);

  // 🚗🌴 youtube url을 입력 받아, 각종 video 정보를 담은 객체로 반환하는 함수 
  const getYoutubeVideoDetails = async (url) => {
    try {
      const videoId = getYouTubeVideoID(url);
      if (!videoId) throw new Error("유효한 YouTube 링크가 아닙니다.");

      // YouTube API 호출 (영상 정보 가져오기)
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`
      );
      const videoData = await videoResponse.json();

      if (!videoData.items || videoData.items.length === 0)
        throw new Error("비디오가 없습니다.");

      const videoInfo = videoData.items[0];
      const { title, channelTitle, publishedAt, thumbnails, channelId } = videoInfo.snippet;
      const { viewCount, likeCount } = videoInfo.statistics;

      // YouTube API 호출 (채널 정보 가져오기)
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`
      );
      const channelData = await channelResponse.json();

      if (!channelData.items || channelData.items.length === 0)
        throw new Error("채널 정보를 가져올 수 없습니다.");

      const channelProfile = channelData.items[0].snippet.thumbnails.default.url;

      // 불러온 영상 정보를 객체로 반환 (답글에도 사용 가능하도록)
      return {
        videoId,
        name: title,
        video: url,
        thumbnail: thumbnails.high.url,
        channel: channelTitle,
        channelProfile,
        views: viewCount,
        likes: likeCount,
        publishedAt: publishedAt.slice(0, 10),
        createdAt: serverTimestamp(),
        recommend: 0,
      };
    } catch (error) {
      console.error("🔥 YouTube API 오류:", error);
      return null;
    }
  };

  // 🚗🌴 동적 라우팅 페이지에 표시할, 메인 영상의 데이터를 fetch해오는 함수 
  const fetchVideoData = async (firstSlug) => {
    if (!auth.currentUser) return;

    try {
        const userId = auth.currentUser.uid;

        // ✅ Firestore 병렬 요청 최적화
        const [docSnap, userDocSnap, userLikeSnap] = await Promise.all([
          getDoc(doc(db, "gallery", firstSlug)),           // 영상 데이터
          getDoc(doc(db, "users", userId)),                // 사용자 정보 (모드 가져오기)
          getDoc(doc(db, "gallery", firstSlug, "likes", userId)), // 좋아요 여부 확인
        ]);

        if (!docSnap.exists()) throw new Error("비디오를 찾을 수 없습니다.");

        const videoData = docSnap.data();
        const userData = userDocSnap.exists() ? userDocSnap.data() : {}; // ✅ userDocSnap.data() 중복 호출 방지
        const mode = userData.Mode === "public";

        setVideo(videoData);
        setEssay(videoData.essay || "");
        setIsPosted(videoData.isPosted || false);
        setIsOn(mode);

        // 만약 public 모드라면 
        if (mode) {
          setLikes(videoData.recommend || 0);
          setLiked(userLikeSnap.exists());
        }

    } catch (error) {
        console.error("Firestore에서 비디오 데이터 가져오는 중 오류 발생: ", error);
        setError(error.message);
    } 
  };

  // 🚗🌴 메인 영상의 게시 & 게시 취소를 관리하는 함수 
  const handleTogglePost = async () => {
    if (!video) return;

    try {
        const docRef = doc(db, "gallery", firstSlug);

        await updateDoc(docRef, { isPosted: !isPosted }); // 반전만 시키면 됨 

        setIsPosted((prevState) => !prevState); // isPosted 변수도 반전 
    } catch (error) {
        console.error("🔥 게시/게시 취소 중 오류 발생:", error);
    }
};

  // 🚗🌴 게시 전, 에세이를 저장하는 함수  
  const handleSaveEssay = async () => {
    if (!auth.currentUser) return;

    try {
      const docRef = doc(db, "gallery", firstSlug);

      await updateDoc(docRef, {
        essay: essay,
        isPosted: false
       }); // essay 필드 업데이트 

      // isPosted 상태 변수는 false로, isEditing 상태 변수도 false로 변경 
      setIsPosted(false);
      setIsEditing(false);
    } catch (error) {
      console.error("에세이 저장 오류: ", error);
    }
  };

  // 🚗🌴 댓글을 작성하는 함수  
  const handlePostReply = async () => {
    if (!replyVideoUrl || !replyEssay) return;
  
    try {
      // 🔥 YouTube API를 통해 답글 영상 정보 가져오기
      const videoDetails = await getYoutubeVideoDetails(replyVideoUrl);
      if (!videoDetails) {
        alert("영상 정보를 불러올 수 없습니다. Youtube Url을 확인하세요.");
        return;
      }
  
      const repliesRef = collection(db, "gallery", firstSlug, "comment");
  
      // 🔥 Firestore에 새로운 답글 추가 (isPosted 기본값: false)
      await addDoc(repliesRef, {
        videoId: videoDetails.videoId,
        name: videoDetails.name,
        video: videoDetails.video,
        thumbnail: videoDetails.thumbnail,
        channel: videoDetails.channel,
        channelProfile: videoDetails.channelProfile,
        views: videoDetails.views,
        likes: videoDetails.likes,
        publishedAt: videoDetails.publishedAt,
        essay: replyEssay,
        createdAt: serverTimestamp(),
        user: userEmail,
        recommend: 0,
        isPosted: false,
      });
  
      // 상태 업데이트 (입력 필드 초기화)
      setReplyVideoUrl("");
      setReplyEssay("");
      setReplying(false);
      // 여기까지가 답글 추가하는 기능 
  
      // 추가한 답글을, allReplies or myReplies 변수에 담아두기까지 해야 끝! 
    const [allRepliesSnapshot, myRepliesSnapshot] = await Promise.all([
      getDocs(query(repliesRef, where("isPosted", "==", true))),  // isPosted가 true인 답글 가져오기
      getDocs(query(repliesRef, where("isPosted", "==", false), where("user", "==", userEmail)))  // isPosted가 false + 내 답글만 가져오기
    ]);

    // ✅ Firestore 데이터 상태 업데이트
    setAllReplies(allRepliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setMyReplies(myRepliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error("🔥 답글 저장 오류: ", error);
    }
  };

  // 🚗🌴 메인 영상의 좋아요를 관리하는 함수 
  const handleLike = async () => {
    if (!video || !auth.currentUser) return;
  
    const userId = auth.currentUser?.uid;
    const docRef = doc(db, "gallery", firstSlug);
    const userLikeRef = doc(db, "gallery", firstSlug, "likes", userId); // gallery 컬렉션의, 현재 페이지의 slug에 해당하는 video의, 현재 user의 like 여부를 참조하는 경로 
  
    try {
      const likeChange = liked ? -1 : 1;
  
      // ✅ Firestore 작업 병렬 실행
      await Promise.all([
        updateDoc(docRef, { recommend: increment(likeChange) }),
        liked ? deleteDoc(userLikeRef) : setDoc(userLikeRef, { liked: true })
      ]);
      
      setLiked((prevLiked) => !prevLiked);
      setLikes((prevLikes) => prevLikes + likeChange);
    } catch (error) {
      console.error("좋아요 업데이트 실패:", error);
    }
  };

  // 🚗🌴 댓글의 좋아요를 관리하는 함수 
  const handleReplyLike = async (commentId) => {
    if (!auth.currentUser) return;
  
    // Firestore 경로 설정
    const userId = auth.currentUser?.uid;
    const replyRef = doc(db, "gallery", firstSlug, "comment", commentId);
    const userLikeRef = doc(db, "gallery", firstSlug, "comment", commentId, "likes", userId);
  
    try {
      const likeSnap = await getDoc(userLikeRef); // 현재 사용자가 좋아요를 눌렀는지 확인
  
      setAllReplies((prevAllReplies) =>
        prevAllReplies.map((reply) =>
          reply.id === commentId
            ? {
                ...reply,
                liked: !likeSnap.exists(), // 좋아요 상태 변경
                recommend: reply.recommend + (likeSnap.exists() ? -1 : 1), // recommend 업데이트
              }
            : reply
        )
      );
  
      if (likeSnap.exists()) {
        // 🔥 이미 좋아요를 눌렀다면 취소
        await updateDoc(replyRef, { recommend: increment(-1) }); // Firestore에서 recommend 1 감소
        await deleteDoc(userLikeRef); // 현재 유저의 like 문서 삭제
      } else {
        // 🔥 좋아요 추가
        await updateDoc(replyRef, { recommend: increment(1) }); // Firestore에서 recommend 1 증가
        await setDoc(userLikeRef, { liked: true }); // 현재 유저의 like 문서 추가
      }
    } catch (error) {
      console.error("🔥 답글 좋아요 업데이트 실패:", error);
    }
  };
  
  // 🚗🌴 현재 user의 email에서, @ 앞부분만 반환하는 함수 
  function getEmailUsername(email) {
    if (!email || typeof email !== "string") return "";
    return email.split("@")[0];
  }

  // 🚗🌴 전체 댓글을 정렬하는 함수 
  const sortedAllReplies = [...allReplies].sort((a, b) => {
      return Number(b.recommend) - Number(a.recommend); // isOn이 true이면 recommend를 기준으로 정렬, recommend가 많은 것(b)부터 정렬 
  });
  // 🚗🌴 작성 중인 댓글 목록을 정렬하는 함수 
  const sortedMyReplies = [...myReplies].sort((a, b) => {
    return Number(b.createdAt) - Number(a.createdAt); // isOn이 true이면 recommend를 기준으로 정렬, recommend가 많은 것(b)부터 정렬 
});

  // 🚗🌴 youtube url을 입력 받아 videoID만 추출하는 함수
  const getYouTubeVideoID = (url) => {

    // 괄호 안의 정규식과, url을 match (형식을 맞춰 봄)
    // 형식이 일치하면, match[1]을 사용해 \/ 사이의 값(videoID에 해당)만 반환
    const pattern = /(?:youtu\.be\/|youtube\.com\/.*[?&]v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/user\/.*#p\/u\/\d\/|youtube\.com\/watch\?.*?v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  };

  // 🚗🌴 댓글 카드 ui 정의
  const ReplyCard = ({ reply, firstSlug, isOn }) => (
    <Card key={reply.id} className="mt-3 w-full max-w-2xl">
      <Link href={`/dashboard/${firstSlug}/${reply.id}`} passHref>
        <div className="relative w-full aspect-video">
          <iframe
            className="w-full h-full rounded-t-lg"
            src={`https://www.youtube.com/embed/${reply.videoId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={`/dashboard/${firstSlug}/${reply.id}`} passHref>
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
          <p className="text-sm text-gray-500 mt-2">
            {reply.views} views · {new Date(reply.publishedAt).toLocaleDateString()}
          </p>
        </Link>
  
        {/* 🔥 답글 좋아요 버튼 (isOn이 true일 때만 표시) */}
        {isOn && (
          <div className="mt-4 flex items-center justify-between">
            <button className="flex items-center p-2 rounded-lg transition" onClick={() => handleReplyLike(reply.id)}>
              <Heart className="w-4 h-4 text-red-500 cursor-pointer" fill={reply.liked ? "currentColor" : "none"} />
              <span className="ml-2 text-lg font-semibold cursor-pointer">{reply.recommend}</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;


  /// 🚜🚜🚜🚜🚜 HTML 🚜🚜🚜🚜🚜 ///
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
          {sortedAllReplies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">전체 댓글 목록</h3>
              {sortedAllReplies.map((reply) => (
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
