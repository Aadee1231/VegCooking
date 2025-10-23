// src/pages/MyAccountPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

type Profile={id:string;username:string|null;avatar_url:string|null;bio?:string|null;location?:string|null;dietary_prefs?:string[]|null;};
type Recipe={id:number;title:string;caption:string|null;image_url:string|null;created_at:string;};
const PREF_OPTIONS=["Vegetarian","Vegan","Gluten-Free","Nut-Free","Dairy-Free","Halal","Kosher","Comfort Food"];

export default function MyAccountPage(){
 const[profile,setProfile]=useState<Profile|null>(null);
 const[own,setOwn]=useState<Recipe[]>([]);
 const[added,setAdded]=useState<Recipe[]>([]);
 const[userId,setUserId]=useState<string|null>(null);
 const[tab,setTab]=useState<"own"|"added">("own");
 const[edit,setEdit]=useState({username:"",bio:"",location:"",dietary_prefs:[] as string[]});
 const[saving,setSaving]=useState(false);

 useEffect(()=>{supabase.auth.getUser().then(({data})=>{const id=data.user?.id??null;setUserId(id);if(id)fetchProfile(id);});},[]);
 async function fetchProfile(id:string){
   const{data:p}=await supabase.from("profiles").select("*").eq("id",id).single();
   setProfile(p as Profile);
   setEdit({username:p?.username??"",bio:p?.bio??"",location:p?.location??"",dietary_prefs:p?.dietary_prefs??[]});
   const[{data:ownR},{data:addedR}]=await Promise.all([
     supabase.from("recipes").select("id,title,caption,image_url,created_at").eq("user_id",id),
     supabase.from("user_added_recipes").select("recipe:recipes(id,title,caption,image_url,created_at)").eq("user_id",id)
   ]);
   setOwn(ownR??[]);setAdded((addedR??[]).map((a:any)=>a.recipe));
 }
 const avatarUrl=(p:string|null)=>p?supabase.storage.from("profile-avatars").getPublicUrl(p).data.publicUrl:"/default-avatar.svg";
 const imgUrl=(p:string|null)=>p?supabase.storage.from("recipe-media").getPublicUrl(p).data.publicUrl:null;

 async function uploadAvatar(e:React.ChangeEvent<HTMLInputElement>){
   const f=e.target.files?.[0];if(!f||!userId)return;
   const path=`${userId}/avatar_${Date.now()}.jpg`;
   await supabase.storage.from("profile-avatars").upload(path,f,{upsert:true});
   await supabase.from("profiles").update({avatar_url:path}).eq("id",userId);
   fetchProfile(userId);
 }
 async function saveProfile(){
   if(!userId)return;setSaving(true);
   await supabase.from("profiles").update(edit).eq("id",userId);
   setSaving(false);fetchProfile(userId);
 }
 function togglePref(p:string){setEdit(prev=>({...prev,dietary_prefs:prev.dietary_prefs.includes(p)?prev.dietary_prefs.filter(x=>x!==p):[...prev.dietary_prefs,p]}));}
 const active=tab==="own"?own:added;

 return(
 <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
  {!profile?<p>Loading...</p>:
  <section className="card" style={{padding:"2rem",width:"100%",maxWidth:900,display:"grid",gridTemplateColumns:"280px 1fr",gap:"1.5rem"}}>
    <div style={{textAlign:"center"}}>
      <div style={{position:"relative"}}>
        <img src={avatarUrl(profile.avatar_url)!} alt="" style={{width:120,height:120,borderRadius:"50%",border:"3px solid var(--brand)",objectFit:"cover"}}/>
        <label style={{position:"absolute",bottom:0,right:0,background:"var(--brand)",color:"#fff",borderRadius:"50%",width:32,height:32,display:"grid",placeItems:"center",cursor:"pointer"}}>
          ⬆<input type="file" accept="image/*" onChange={uploadAvatar} style={{display:"none"}}/>
        </label>
      </div>
      <h2 style={{color:"var(--brand)",marginTop:10}}>{edit.username}</h2>
      {edit.location&&<p style={{color:"#999"}}>📍{edit.location}</p>}
      {edit.bio&&<p style={{marginTop:6}}>{edit.bio}</p>}
      <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
        {edit.dietary_prefs.map(p=><span key={p} className="btn btn-secondary" style={{padding:"4px 10px"}}>{p}</span>)}
      </div>
    </div>

    <div>
      <h3 style={{color:"var(--brand)"}}>Edit Profile</h3>
      <input value={edit.username} onChange={e=>setEdit({...edit,username:e.target.value})} placeholder="Username"/>
      <input value={edit.location} onChange={e=>setEdit({...edit,location:e.target.value})} placeholder="Location"/>
      <textarea rows={3} value={edit.bio} onChange={e=>setEdit({...edit,bio:e.target.value})} placeholder="Bio"/>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
        {PREF_OPTIONS.map(p=><button key={p} onClick={()=>togglePref(p)} className={edit.dietary_prefs.includes(p)?"btn":"btn btn-secondary"}>{p}</button>)}
      </div>
      <button className="btn" disabled={saving} onClick={saveProfile}>{saving?"Saving...":"Save"}</button>
      <div style={{marginTop:10}}>
        <button onClick={()=>setTab("own")} className={tab==="own"?"btn":"btn btn-secondary"}>Your Recipes</button>
        <button onClick={()=>setTab("added")} className={tab==="added"?"btn":"btn btn-secondary"}>Added</button>
      </div>
    </div>
  </section>}
  
  <div style={{maxWidth:900,width:"100%",marginTop:24,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"1rem"}}>
   {active.map(r=>(
     <Link key={r.id} to={`/r/${r.id}`} className="card" style={{overflow:"hidden"}}>
       {r.image_url&&<img src={imgUrl(r.image_url)!} alt="" style={{width:"100%",height:160,objectFit:"cover"}}/>}
       <div style={{padding:12}}>
         <strong style={{color:"var(--brand)"}}>{r.title}</strong>
         {r.caption&&<p style={{fontSize:".9rem",color:"#888"}}>{r.caption}</p>}
       </div>
     </Link>
   ))}
  </div>
 </div>);
}
