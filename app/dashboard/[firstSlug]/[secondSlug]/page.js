// useState, useEffect 등 react hook은 클라이언트 사이드에서만 실행되므로, 클라이언트 컴포넌트임을 선언하는 것 
"use client";

// react hook
import { useEffect, useState } from "react";

// next.js 
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

// firebase 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, deleteDoc, writeBatch, setDoc, increment} from "firebase/firestore";

// shadcn
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// lucide-react 
import { Trash2, ThumbsUp, ArrowLeft, Heart } from "lucide-react";

// export default: 다른 곳에서 import 할 수 있게 함
// 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function SecondSlugPage() {

  // URL에서 slug 가져오기
  const { firstSlug, secondSlug } = useParams(); 

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

  // error info 
  const [error, setError] = useState(null);

  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  useEffect(() => {
    // onAuthStateChanged(auth, callback): 사용자의 로그인 상태 변경을 감지하는 firebase authentication의 이벤트 리스너 
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

        // 현재 사용자와 현재 사용자의 이메일을, 각각 user와 userEmail로 설정 
        if (currentUser) {
            setUser(currentUser);
            setUserEmail(currentUser.email);
            console.log(firstSlug, secondSlug);
            setIsOn(true);

            try {
                // 현재 user 정보를 가져옴 
                const userDocRef = doc(db, "gallery", firstSlug, "comment", secondSlug); // db 경로 정의
                const userDocSnap = await getDoc(userDocRef);// 해당 db 경로의 문서 불러옴 

                // 해당 문서 Mode 필드의 값이 public이면 mode = true, 아니면 mode = false
                // isOn 값도 mode 값에 따라 변경 
                setIsPosted(userDocSnap.data().isPosted);


                // 현재 페이지의 slug 값에 알맞게 fetchVideoData 함수 실행 
                await fetchVideoData(firstSlug, secondSlug);
            } catch (error) {
                console.error("사용자 Mode 데이터를 가져오는 중 오류 발생:", error);
            }
        } else {
            console.log("❌ 로그인되지 않음");
            router.push("/");
            setUserEmail("");
            return;
        }
    });

    // '컴포넌트가 rendering 되면, 정의한 unsubscribe 함수를 return하세요'인 것 + 이벤트 리스너 해제 
    return () => unsubscribe();
  
  // 의존성 배열에 slug와 router 포함 -> slug 값이 변경될 때마다 & router 값이 변경될 때마다 실행
  }, [firstSlug, secondSlug, router, isPosted]);

  // 🚗🌴 secondSlugPage에 표시할 표시할 댓글 영상의 데이터를 fetch해오는 함수 
  const fetchVideoData = async () => {
    if (!auth.currentUser) return;

    try {
        const userId = auth.currentUser.uid;

        const [videoSnap, userLikeSnap] = await Promise.all([
          getDoc(doc(db, "gallery", firstSlug, "comment", secondSlug)),
          getDoc(doc(db, "gallery", firstSlug, "comment", secondSlug, "likes", userId)
        )]);

        if (!videoSnap.exists()) throw new Error("❌ 해당 비디오를 찾을 수 없습니다.");

        const videoData = videoSnap.data();
        setVideo(videoData);
        setEssay(videoData.essay || "");
        setIsPosted(videoData.isPosted || false);
        setLikes(videoData.recommend || 0);
        setLiked(userLikeSnap.exists());
    } catch (error) {
        console.error("fetchVideoDeta 함수 에러: ", error);
        setError(error.message);
    }
  };

  // 에세이 저장 
  const handleSaveEssay = async () => {

    if (!auth.currentUser) return;

    try {

      // / 현재 사용자가 저장한, 현재 페이지의 slug를 videoId로 가지는 video 문서의 essay 필드 업데이트 
      const userId = auth.currentUser?.uid;
      const docRef = doc(db, "gallery", firstSlug, "comment", secondSlug); // db 경로 설정 
      await updateDoc(docRef, { essay }); // essay 필드 업데이트 

      // 수정 시, gallery 컬렉션에서 해당 영상은 일단 삭제 (수정 후 다시 게시)
      // firestore db의 gallery 컬렉션에서, video 필드의 값이 video.video와 일치하는 것(즉 동일한 url을 가지는 것)만 query하도록
      const q = query(collection(db, "gallery", firstSlug, "comment"), where("video", "==", video.video));
      const querySnapshot = await getDocs(q); // 🔥 Firestore에서 쿼리 실행
      
      // 🔥 querySnapshot을 순회하면서 각 문서 업데이트
      const batch = writeBatch(db); // 🔥 Firestore의 batch 사용
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { isPosted: false });
      });
      
      await batch.commit(); // ✅ 한 번에 업데이트 실행
      

      // isPosted 상태 변수는 false로, isEditing 상태 변수도 false로 변경 
      setIsPosted(false);
      setIsEditing(false);
    } catch (error) {
      console.error("handleSaveEssay 함수 에러: ", error);
    }
  };
  

  // 🚗🌴 댓글 영상의 게시 & 게시 취소를 관리하는 함수  
  const handleTogglePost = async () => {
    if (!video || !auth.currentUser) return;

    try {
        // 현재 사용자가 저장한, 현재 페이지의 slug를 videoId로 가지는 video 정보 가져옴 
        const userDocRef = doc(db, "gallery", firstSlug, "comment", secondSlug); // db 경로 설정 

        await updateDoc(userDocRef, { isPosted: !isPosted });  // firestore 업데이트
        
        setIsPosted((prev) => !prev); // isPosted 변수 업데이트 
    } catch (error) {
        console.error("🔥 게시/게시 취소 중 오류 발생:", error);
    }
  };

  // 🚗🌴 댓글 영상의 좋아요를 관리하는 함수
  const handleLike = async () => {
    if (!video || !auth.currentUser) return;

    const userId = auth.currentUser?.uid;
    const docRef = doc(db, "gallery", firstSlug, "comment", secondSlug);
    const userLikeRef = doc(db, "gallery", firstSlug, "comment", secondSlug, "likes", userId);

    try {
      const likeChange = liked ? -1 : 1;
  
      // Firestore 쿼리 병렬 실행
      await Promise.all([
        updateDoc(docRef, { recommend: increment(likeChange) }),
        liked ? deleteDoc(userLikeRef) : setDoc(userLikeRef, { liked: true })
      ]);
  
      // 상태 변수 업데이트
      setLiked((prevLiked) => !prevLiked);
      setLikes((prevLikes) => prevLikes + likeChange);
  
    } catch (error) {
      console.error("🔥 좋아요 업데이트 실패:", error);
    }
  };

  // 🚗🌴 youtube url을 입력 받아 videoID만 추출하는 함수
  const getYouTubeVideoID = (url) => {
    const pattern = /(?:youtu\.be\/|youtube\.com\/.*[?&]v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/user\/.*#p\/u\/\d\/|youtube\.com\/watch\?.*?v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  };  

  // 🚗🌴 현재 user의 email에서, @ 앞부분만 반환하는 함수 
  function getEmailUsername(email) {
    if (!email || typeof email !== "string") return "";
    return email.split("@")[0];
  }








  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="flex flex-col items-center w-full p-6">
      <div className="w-full max-w-2xl flex justify-between">
        <button className="flex items-center mb-2">
          <ArrowLeft onClick={() => router.push(`/dashboard/${firstSlug}`)} className="w-6 h-6 mr-2 cursor-pointer" />
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
                {isOn && isPosted && (
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
              {true ? (
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
              { (userEmail == video.user) && (
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
          {(userEmail == video.user) && (
                <button
                  onClick={async () => {
                    if (!video || !video.video) return alert("삭제할 비디오 데이터가 없습니다.");
                    if (!user?.uid) return alert("사용자 정보가 없습니다.");

                    try {
                      const batch = writeBatch(db);

                      const userVideosRef = collection(db, "gallery", firstSlug, "comment");
                      const userQuery = query(userVideosRef, where("video", "==", video.video));
                      const userQuerySnapshot = await getDocs(userQuery);

                      userQuerySnapshot.forEach((doc) => {
                        batch.delete(doc.ref); 
                      });

                      // 🔥 모든 삭제 작업 실행
                      await batch.commit();

                      alert("비디오가 삭제되었습니다.");
                      router.push("/dashboard");
                    } catch (error) {
                      console.error("비디오 삭제 중 오류 발생: ", error);
                      alert("삭제 중 오류가 발생했습니다.");
                    }
                  }}
                  className="z-5 absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                >
                  <Trash2 size={32} />
                </button>
              )}
        </Card>
      )}
    </div>
  );
}
