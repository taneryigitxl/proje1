import { api, ONLINE_ENABLED } from './src/network/OnlineApi.js';
const form=document.getElementById('login-form'),button=document.getElementById('start-button'),username=document.getElementById('login-username'),quality=document.getElementById('quality-select'),status=document.querySelector('#menu-status span');
const allowed=new Set(['low','medium','high']);
function apply(value,announce){
 const selected=allowed.has(value)?value:'medium';document.body.dataset.quality=selected;quality.value=selected;document.getElementById('pause-quality').value=selected;
 try{localStorage.setItem('tora-quality',selected);}catch{}
 document.dispatchEvent(new CustomEvent('tora:quality',{detail:{quality:selected}}));
 if(announce)status.textContent='Görüntü kalitesi güncellendi.';
}
if (ONLINE_ENABLED) {
 form.querySelector('.section-label').textContent='GERÇEK ÇEVRİMİÇİ HESAP';
 form.querySelector('label[for="login-username"]').firstChild.textContent='Kullanıcı adı veya e-posta';
 form.querySelector('.profile-note').textContent='Hesabın ve karakterlerin sunucuda saklanır.';
 username.autocomplete='username';
 const password=document.createElement('input');password.id='login-password';password.name='password';password.type='password';password.minLength=12;password.maxLength=128;password.required=true;password.autocomplete='current-password';password.placeholder='Şifre';
 const passwordLabel=document.createElement('label');passwordLabel.textContent='Şifre';passwordLabel.append(password);username.closest('label').after(passwordLabel);
 const email=document.createElement('input');email.id='login-email';email.type='email';email.autocomplete='email';email.placeholder='E-posta';
 const emailLabel=document.createElement('label');emailLabel.textContent='E-posta';emailLabel.hidden=true;emailLabel.append(email);passwordLabel.before(emailLabel);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';toggle.textContent='Yeni hesap oluştur';button.after(toggle);
 let registering=false;
 toggle.addEventListener('click',()=>{registering=!registering;emailLabel.hidden=!registering;email.required=registering;username.closest('label').firstChild.textContent=registering?'Kullanıcı adı':'Kullanıcı adı veya e-posta';button.textContent=registering?'HESAP OLUŞTUR':'DİYARA GİR';toggle.textContent=registering?'Giriş yap':'Yeni hesap oluştur';status.textContent=registering?'En az 12 karakterli bir şifre seç.':'Hesabınla giriş yap.';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;button.disabled=true;status.textContent=registering?'Hesap oluşturuluyor…':'Giriş yapılıyor…';
  try {if(registering)await api('/auth/register',{method:'POST',body:{username:username.value.trim(),email:email.value.trim(),password:password.value}});
   const data=await api('/auth/login',{method:'POST',body:{login:username.value.trim(),password:password.value}});
   password.value='';status.textContent='Karakterler yükleniyor…';document.dispatchEvent(new CustomEvent('tora:profile',{detail:{quality:quality.value,username:data.account.username,account:data.account,online:true}}));
  } catch(error){status.textContent=error.message;button.disabled=false;}
 });
} else form.addEventListener('submit',event=>{
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
