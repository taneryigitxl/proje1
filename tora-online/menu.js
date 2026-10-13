const form=document.getElementById('login-form'),button=document.getElementById('start-button'),username=document.getElementById('login-username'),quality=document.getElementById('quality-select'),status=document.querySelector('#menu-status span');
const allowed=new Set(['low','medium','high']);
function apply(value,announce){
 const selected=allowed.has(value)?value:'medium';document.body.dataset.quality=selected;quality.value=selected;document.getElementById('pause-quality').value=selected;
 try{localStorage.setItem('tora-quality',selected);}catch{}
 document.dispatchEvent(new CustomEvent('tora:quality',{detail:{quality:selected}}));
 if(announce)status.textContent='Görüntü kalitesi güncellendi.';
}
form.addEventListener('submit',event=>{
 event.preventDefault();if(button.disabled)return;const name=username.value.trim();
 if(name.length<2 || !/^[\p{L}\p{N} _-]+$/u.test(name)){status.textContent='2–24 harf veya rakamdan oluşan bir profil adı yaz.';username.focus();return;}
 try{localStorage.setItem('tora-profile',name);}catch{}
 button.disabled=true;status.textContent='Diyar kapısı açılıyor…';
 document.dispatchEvent(new CustomEvent('tora:profile',{detail:{quality:quality.value,username:name,isAdmin:false}}));
});
quality.addEventListener('change',e=>apply(e.target.value,true));
let saved='medium';try{saved=localStorage.getItem('tora-quality')||saved;username.value=localStorage.getItem('tora-profile')||'Ayaz';}catch{username.value='Ayaz';}
apply(saved,false);
window.ToraMenu={applyQuality:apply,unlock:()=>{button.disabled=false;button.classList.remove('is-launching');}};
