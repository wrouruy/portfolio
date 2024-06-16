onGithub.onclick = function(){
    window.location.href = 'https://github.com/wrouruy';
}

// dot reaction (First)
viewGame.onclick = function(){
    window.location.href = 'https://wrouruy.github.io/dotReaction/';
}
viewGithub.onclick = function(){
    window.location.href = 'https://github.com/wrouruy/dotReaction';
}

// ... (Second)
viewGameOne.onclick = function(){
    window.location.href = 'https://wrouruy.github.io/file-Detector/';
}
viewGithubOne.onclick = function(){
    window.location.href = 'https://github.com/wrouruy/file-Detector';
}

// ... (Thirt)
viewGameTwo.onclick = function(){
    window.location.href = 'https://wrouruy.github.io/calculate/';
}
viewGithubTwo.onclick = function(){
    window.location.href = 'https://github.com/wrouruy/calculate';
}

// ... (Four)
viewGameThree.onclick = function(){
    window.location.href = '';
}
viewGithubThree.onclick = function(){
    window.location.href = '';
}

document.getElementById('scrollFormspree').addEventListener('click', function() {
    window.scrollTo(0, document.body.scrollHeight);
});

document.getElementById('scrollMyProject').addEventListener('click', function() {
    window.scrollTo(document.body.scrollHeight, 1230);
});


let toProject = 1240
downToProject.onclick = function() {
    wrap.style.height = '300vh'
    other.style.display = 'flex'
    window.scrollTo(document.body.scrollHeight, toProject);
    angleDown.style.color = 'transparent'
    setTimeout(() =>{
        mouseEnter.style.display = 'none'
        noneContainer.style.display = 'flex'
    }, 1000)
}
downToFormspree.onclick = function() {
    wrap.style.height = '300vh'
    other.style.display = 'flex'
    window.scrollTo(0, document.body.scrollHeight);
    angleDown.style.color = 'transparent'
    
    setTimeout(() =>{
        mouseEnter.style.display = 'none'
        noneContainer.style.display = 'flex'
    }, 100)
}

mouseEnter.onmouseenter = function(){
    wrap.style.height = '300vh'
    other.style.display = 'flex'
    window.scrollTo(document.body.scrollHeight, toProject);
    angleDown.style.color = 'transparent'
    
    setTimeout(() =>{
        mouseEnter.style.display = 'none'
        noneContainer.style.display = 'flex'
    }, 100)
}


