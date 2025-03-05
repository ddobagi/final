"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, deleteDoc, writeBatch, setDoc, increment} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ArrowLeft, Heart } from "lucide-react";

export default function VideoDetail() {
  const { slug } = useParams(); // URL에서 slug 가져오기
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [essay, setEssay] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [isOn, setIsOn] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(1);
  const [userEmail, setUserEmail] = useState("");
  const [previousPage, setPreviousPage] = useState("/dashboard");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            setLoading(true);
            setUserEmail(currentUser.email);
            console.log("로그인한 사용자 감지 ");

            try {
                const userDocRef = doc(db, "users", currentUser.uid);
                console.log("1번 uid 통과");
                const userDocSnap = await getDoc(userDocRef);
                const mode = userDocSnap.exists() && userDocSnap.data().Mode === "public";

                setIsOn(mode);
                await fetchVideoData(slug, mode);
            } catch (error) {
                console.error("사용자 Mode 데이터를 가져오는 중 오류 발생:", error);
                await fetchVideoData(slug, false);
            }
        } else {
            console.log("❌ 로그인되지 않음");
            router.push("/");
            setLoading(false);
            setUserEmail("");
            return;
        }
    });

    return () => unsubscribe();
  }, [slug, router]);

  useEffect(() => {
    if (document.referrer.includes("/dashboard/likes")) {
      setPreviousPage("/dashboard/likes");
    }
  }, []);

  const getYouTubeVideoID = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/.*v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/.*#p\/u\/\d\/|youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^#&?\n]+)/);
    return match ? match[1] : null;
  };

  // ✅ `isOn`이 변경될 때 fetchVideoData를 실행하지 않고, 위 `useEffect`에서 직접 실행함
  const fetchVideoData = async (slug, mode) => {
    if (!auth.currentUser) return;
    try {
        setLoading(true);
        const userId = auth.currentUser?.uid;

        let docRef = mode ? doc(db, "gallery", slug) : doc(db, "users", userId, "videos", slug);

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const videoData = docSnap.data();
            setVideo(videoData);
            setEssay(videoData.essay || "");
            setIsPosted(videoData.isPosted || false);
        } else {
            throw new Error(`해당 비디오를 찾을 수 없습니다. (isOn: ${mode})`);
        }

        if (mode) {
          const videoData = docSnap.data();
          setLikes(videoData.recommend || 0);

          const userId = auth.currentUser?.uid;

          const [userLikeSnap, userDocSnap] = await Promise.all([
            getDoc(doc(db, "gallery", slug, "likes", userId)),
            getDoc(doc(db, "users", userId))
          ]);
          console.log("3번 uid 통과");

          setLiked(userLikeSnap.exists());

          if (userDocSnap.exists() && userDocSnap.data().Mode) {
            setIsOn(userDocSnap.data().Mode === "public"); // ✅ Mode 값에 따라 isOn 설정
          } else {
            setIsOn(false); // ✅ Mode 값이 없으면 기본값 설정
          }
        }
    } catch (error) {
        console.error("Firestore에서 비디오 데이터 가져오는 중 오류 발생: ", error);
        setError(error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleTogglePost = async () => {
    if (!video) return;
    if (!auth.currentUser) return;

    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            console.log("정상 작동 중");
            return;
        }

        if (!slug) {
            console.error("❌ slug 값이 존재하지 않음");
            return;
        }

        const userDocRef = doc(db, "users", userId, "videos", slug);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            console.error("❌ 사용자의 해당 비디오 데이터가 Firestore에 존재하지 않음");
            return;
        }

        if (isPosted) {
            // ✅ 게시 취소: gallery에서 삭제
            const q = query(collection(db, "gallery"), where("video", "==", video.video));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.warn("⚠️ gallery에 해당 비디오가 없음");
            } else {
                const batch = writeBatch(db);
                querySnapshot.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();
            }

            // ✅ 사용자의 videos 데이터 업데이트
            await updateDoc(userDocRef, { isPosted: false });
            setIsPosted(false);
        } else {
            // ✅ 🔥 Firestore에 저장된 essay 최신값을 다시 가져옴


            // ✅ 게시: Firestore에 추가
            await addDoc(collection(db, "gallery"), {
                name: video.name || "알 수 없음",
                video: video.video || "",
                thumbnail: video.thumbnail || "",
                channel: video.channel || "알 수 없음",
                views: video.views || 0,
                likes: video.likes || 0,
                publishedAt: video.publishedAt || serverTimestamp(),
                channelProfile: video.channelProfile || "",
                post: true, // 새로운 문서에 post 필드 추가
                essay: latestEssay, // 🔥 최신 essay 값 저장
                createdAt: video.createdAt, // 문서 생성 시간 추가
                recommend: video.recommend || 0,
            });

            // ✅ 사용자의 videos 데이터 업데이트
            await updateDoc(userDocRef, { isPosted: true });
            setIsPosted(true);
        }
    } catch (error) {
        console.error("🔥 게시/게시 취소 중 오류 발생:", error);
    }
};


  const handleSaveEssay = async () => {
    if (!auth.currentUser) return;

    try {
      const userId = auth.currentUser?.uid;
      const docRef1 = doc(db, "users", userId, "videos", slug);
      await updateDoc(docRef1, { essay });



      // 🔥 추가된 코드: gallery 컬렉션에서 해당 영상 삭제
      const q = query(collection(db, "gallery"), where("video", "==", video.video));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // UI 업데이트
      setIsPosted(false);
      setIsEditing(false);
    } catch (error) {
      console.error("에세이 저장 오류: ", error);
    }
  };
  
  const handleLike = async () => {
    if (!video) return;
    if (!auth.currentUser) return;

    const userId = auth.currentUser?.uid;
    const docRef = doc(db, "gallery", slug);
    const userLikeRef = doc(db, "gallery", slug, "likes", userId);

    try {
      if (liked) {
        // 🟥 이미 좋아요를 누른 상태 → 좋아요 취소
        await updateDoc(docRef, { recommend: increment(-1) }); // 추천 감소
        await deleteDoc(userLikeRef); // 사용자의 좋아요 기록 삭제

        setLiked(false);
        setLikes((prevLikes) => prevLikes - 1);
      } else {
        // 🟩 아직 좋아요를 누르지 않은 상태 → 좋아요 추가
        await updateDoc(docRef, { recommend: increment(1) }); // 추천 증가
        await setDoc(userLikeRef, { liked: true }); // 사용자의 좋아요 기록 추가

        setLiked(true);
        setLikes((prevLikes) => prevLikes + 1);
      }
    } catch (error) {
      console.error("좋아요 업데이트 실패:", error);
    }
  };

  function getEmailUsername(email) {
    if (!email || typeof email !== "string") return "";
    return email.split("@")[0];
  }









  if (loading) return <p className="text-center mt-10">로딩 중...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="flex flex-col items-center w-full p-6">
      <div className="w-full max-w-2xl flex justify-between">
        <button onClick={() => router.push(previousPage)} className="flex items-center mb-2 cursor-pointor">
          <ArrowLeft className="w-6 h-6 mr-2" />
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
                <img src={video.channelProfile} alt="Channel Profile" className="w-10 h-10 rounded-full mr-3" />
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
                    <Heart className="w-4 h-4 text-red-500" fill={liked ? "currentColor" : "none"} />
                    <span className="ml-2 text-lg font-semibold">{likes}</span>
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
    </div>
  );
}