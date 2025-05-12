// 初始化DOM引用
const container = document.getElementById('comparisonContainer');
const handle = document.querySelector('.slider-handle');
const beforeImage = document.querySelector('.image-before');
const afterImage = document.querySelector('.image-after');
const imageContainer = document.querySelector('.image-container');
const splitContainers = document.querySelectorAll('.image-split-container');
const leftContainer = document.getElementById('leftContainer');
const rightContainer = document.getElementById('rightContainer');
const swapBtn = document.getElementById('swapBtn');
const swapBtnContainer = document.getElementById('swapBtnContainer');

// 新增缩放控制UI
const zoomControls = document.getElementById('zoomControls');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetZoomBtn = document.getElementById('resetZoomBtn');
const zoomLevelDisplay = document.getElementById('zoomLevel');

// 模式切换按钮
const comparisonModeBtn = document.getElementById('comparisonModeBtn');
const fadeModeBtn = document.getElementById('fadeModeBtn');
const splitModeBtn = document.getElementById('splitModeBtn');
const fadeSliderContainer = document.getElementById('fadeSliderContainer');
const fadeSlider = document.getElementById('fadeSlider');
const opacityValue = document.getElementById('opacityValue');

// 状态变量 - 分离各模式的状态管理
const comparisonState = {
    isDragging: false,
    isHandleDragging: false,
    percentage: 50
};

const fadeState = {
    opacity: 80
};

const splitState = {
    scaleFactor: 1,
    minScale: 0.5,
    maxScale: 10,  // 增大最大缩放比例
    isDragging: false,
    translateX: 0,
    translateY: 0,
    startX: 0,
    startY: 0,
    doubleClickTimer: null,
    isDoubleClick: false
};

let currentMode = 'comparison'; // 默认模式为滑动对比
let imagesSwapped = false; // 图片是否已交换

// 图片加载状态处理
const images = [beforeImage, afterImage];
let loadedImages = 0;

images.forEach(img => {
    const imgObj = new Image();
    imgObj.onload = () => {
        loadedImages++;
        if (loadedImages === images.length) {
            container.classList.remove('loading');
        }
    };
    imgObj.src = img.style.backgroundImage.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1');
});

// 文件选择输入框
const beforeFileInput = document.getElementById('beforeFile');
const afterFileInput = document.getElementById('afterFile');

// 左侧图片选择事件
beforeFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            beforeImage.style.backgroundImage = `url(${event.target.result})`;
            container.classList.add('loading');

            const img = new Image();
            img.onload = () => container.classList.remove('loading');
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 右侧图片选择事件
afterFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            afterImage.style.backgroundImage = `url(${event.target.result})`;
            container.classList.add('loading');

            const img = new Image();
            img.onload = () => container.classList.remove('loading');
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 模式切换逻辑
// 模式切换逻辑
function switchMode(newMode) {
    currentMode = newMode;
    container.className = `comparison-container ${newMode}-mode`;

    // 重置按钮状态
    comparisonModeBtn.classList.toggle('active', newMode === 'comparison');
    fadeModeBtn.classList.toggle('active', newMode === 'fade');
    splitModeBtn.classList.toggle('active', newMode === 'split');

    // 显示/隐藏相关组件
    fadeSliderContainer.style.display = newMode === 'fade' ? 'block' : 'none';
    swapBtnContainer.style.display = 'block';
    zoomControls.style.display = newMode === 'split' ? 'flex' : 'none';

    // 重置模式相关状态
    if (newMode === 'comparison') {
        // 恢复滑动模式状态
        beforeImage.style.transform = afterImage.style.transform = 'none';
        beforeImage.style.opacity = '1';
        afterImage.style.opacity = '1';
        beforeImage.style.clipPath = `inset(0 0 0 ${comparisonState.percentage}%)`;
        handle.style.left = `${comparisonState.percentage}%`;
    } else if (newMode === 'fade') {
        // 恢复淡入淡出模式状态
        beforeImage.style.transform = afterImage.style.transform = 'none';
        afterImage.style.opacity = fadeState.opacity / 100;
        beforeImage.style.clipPath = 'none';
    } else if (newMode === 'split') {
        // 恢复分栏模式状态
        beforeImage.style.opacity = '1';
        afterImage.style.opacity = '1';
        beforeImage.style.backgroundSize = 'contain'; // 确保图片完整显示
        afterImage.style.backgroundSize = 'contain';  // 确保图片完整显示
        updateSplitImagesTransform();
    }

    // 更新缩放显示
    updateZoomDisplay();
}

// 更新split模式下图片的变换
function updateSplitImagesTransform() {
    beforeImage.style.transform = `scale(${splitState.scaleFactor}) translate(${splitState.translateX}px, ${splitState.translateY}px)`;
    afterImage.style.transform = `scale(${splitState.scaleFactor}) translate(${splitState.translateX}px, ${splitState.translateY}px)`;

    // 更新缩放显示
    updateZoomDisplay();
}

// 更新缩放显示
function updateZoomDisplay() {
    if (currentMode !== 'split') return;
    zoomLevelDisplay.textContent = `${Math.round(splitState.scaleFactor * 100)}%`;
}

// 交换左右图片
function swapImages() {
    if (currentMode !== 'split') return;

    const tempImage = beforeImage.style.backgroundImage;
    beforeImage.style.backgroundImage = afterImage.style.backgroundImage;
    afterImage.style.backgroundImage = tempImage;

    imagesSwapped = !imagesSwapped;
}

// 双击放大/缩小功能
function handleDoubleClick(e) {
    if (currentMode !== 'split') return;

    // 清除之前的定时器
    if (splitState.doubleClickTimer) {
        clearTimeout(splitState.doubleClickTimer);
    }

    // 如果是第二次点击
    if (splitState.isDoubleClick) {
        splitState.isDoubleClick = false;

        // 计算点击位置相对于图片容器的比例
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 计算点击在左侧还是右侧容器
        const isLeftContainer = clickX < rect.width / 2;

        // 计算点击位置在容器中的相对位置
        const relativeX = isLeftContainer ? clickX : clickX - rect.width / 2;
        const relativeY = clickY;

        // 计算容器
        // 计算容器尺寸
        const containerWidth = rect.width / 2;
        const containerHeight = rect.height;

        // 放大或缩小
        if (splitState.scaleFactor < 2) {
            // 放大到2倍
            zoomTo(2, relativeX, relativeY, isLeftContainer);
        } else if (splitState.scaleFactor < 5) {
            // 放大到5倍
            zoomTo(5, relativeX, relativeY, isLeftContainer);
        } else {
            // 重置为原始大小和位置
            splitState.scaleFactor = 1;
            splitState.translateX = 0;
            splitState.translateY = 0;
        }

        // 更新图片变换
        updateSplitImagesTransform();

        // 阻止后续的单击事件
        e.stopPropagation();
        e.preventDefault();
    } else {
        // 标记为第一次点击
        splitState.isDoubleClick = true;

        // 设置定时器，如果在300ms内没有第二次点击，则重置标记
        splitState.doubleClickTimer = setTimeout(() => {
            splitState.isDoubleClick = false;
        }, 300);
    }
}

// 缩放并保持点击位置不变
function zoomTo(newScale, clickX, clickY, isLeftContainer) {
    // 计算容器尺寸
    const containerWidth = container.getBoundingClientRect().width / 2;
    const containerHeight = container.getBoundingClientRect().height;

    // 计算放大后的中心点偏移
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // 计算从中心点到点击点的偏移
    const offsetX = clickX - centerX;
    const offsetY = clickY - centerY;

    // 计算缩放比例变化
    const scaleRatio = newScale / splitState.scaleFactor;

    // 调整平移量，使点击点保持在原位
    if (isLeftContainer) {
        splitState.translateX = (splitState.translateX - offsetX) * scaleRatio + offsetX;
    } else {
        splitState.translateX = (splitState.translateX - containerWidth - offsetX) * scaleRatio + containerWidth + offsetX;
    }
    splitState.translateY = (splitState.translateY - offsetY) * scaleRatio + offsetY;

    // 设置新的缩放比例
    splitState.scaleFactor = newScale;
}

// 模式切换按钮事件
comparisonModeBtn.addEventListener('click', () => switchMode('comparison'));
fadeModeBtn.addEventListener('click', () => switchMode('fade'));
splitModeBtn.addEventListener('click', () => switchMode('split'));

// 交换按钮事件
swapBtn.addEventListener('click', swapImages);

// 新增split模式同步缩放功能
container.addEventListener('wheel', (e) => {
    if (currentMode !== 'split') return;

    e.preventDefault();

    // 计算鼠标位置
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 计算鼠标在哪个容器
    const isLeftContainer = mouseX < rect.width / 2;
    const relativeX = isLeftContainer ? mouseX : mouseX - rect.width / 2;

    // 缩放因子
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(splitState.minScale, Math.min(splitState.maxScale, splitState.scaleFactor + delta));

    // 缩放并保持鼠标位置不变
    zoomTo(newScale, relativeX, mouseY, isLeftContainer);

    // 更新图片变换
    updateSplitImagesTransform();
});

// 淡入淡出控制 - 修改为控制 afterImage 的透明度
fadeSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    fadeState.opacity = parseInt(value);
    afterImage.style.opacity = fadeState.opacity / 100; // 修改为 afterImage
    opacityValue.textContent = `${value}%`;
});

// 滑动手柄鼠标按下事件
handle.addEventListener('mousedown', (e) => {
    if (currentMode !== 'comparison') return;

    comparisonState.isDragging = true;
    comparisonState.isHandleDragging = true;
    container.classList.add('dragging');
    e.preventDefault();
});

// 图片容器鼠标按下事件
imageContainer.addEventListener('mousedown', (e) => {
    if (currentMode !== 'comparison') return;
    if (comparisonState.isHandleDragging) return;

    comparisonState.isDragging = true;
    const rect = container.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    comparisonState.percentage = (clickPosition / rect.width) * 100;

    // 更新分割位置
    beforeImage.style.clipPath = `inset(0 0 0 ${comparisonState.percentage}%)`;
    handle.style.left = `${comparisonState.percentage}%`;

    container.classList.add('image-dragging');
    e.preventDefault();
});

// 左右分栏模式下的鼠标按下事件
splitContainers.forEach(container => {
    container.addEventListener('mousedown', (e) => {
        if (currentMode !== 'split') return;

        splitState.isDragging = true;
        splitState.startX = e.clientX;
        splitState.startY = e.clientY;

        // 更改鼠标样式
        beforeImage.style.cursor = 'grabbing';
        afterImage.style.cursor = 'grabbing';

        e.preventDefault();
    });

    // 添加双击事件
    container.addEventListener('click', handleDoubleClick);
});

// 缩放控制按钮事件
zoomInBtn.addEventListener('click', () => {
    if (currentMode !== 'split') return;

    // 获取容器尺寸
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width / 2;
    const containerHeight = rect.height;

    // 放大到中心点
    zoomTo(Math.min(splitState.maxScale, splitState.scaleFactor + 0.5), containerWidth / 2, containerHeight / 2, true);
    updateSplitImagesTransform();
});

zoomOutBtn.addEventListener('click', () => {
    if (currentMode !== 'split') return;

    // 获取容器尺寸
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width / 2;
    const containerHeight = rect.height;

    // 缩小到中心点
    zoomTo(Math.max(splitState.minScale, splitState.scaleFactor - 0.5), containerWidth / 2, containerHeight / 2, true);
    updateSplitImagesTransform();
});

resetZoomBtn.addEventListener('click', () => {
    if (currentMode !== 'split') return;

    // 重置缩放
    splitState.scaleFactor = 1;
    splitState.translateX = 0;
    splitState.translateY = 0;
    updateSplitImagesTransform();
});

// 鼠标移动事件
document.addEventListener('mousemove', (e) => {
    if (comparisonState.isDragging && currentMode === 'comparison') {
        const rect = container.getBoundingClientRect();
        const xPos = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
        comparisonState.percentage = (xPos / rect.width) * 100;

        requestAnimationFrame(() => {
            beforeImage.style.clipPath = `inset(0 0 0 ${comparisonState.percentage}%)`;
            handle.style.left = `${comparisonState.percentage}%`;
        });
    } else if (splitState.isDragging && currentMode === 'split') {
        const deltaX = e.clientX - splitState.startX;
        const deltaY = e.clientY - splitState.startY;

        splitState.translateX += deltaX;
        splitState.translateY += deltaY;

        splitState.startX = e.clientX;
        splitState.startY = e.clientY;

        // 同步拖动两个图片
        updateSplitImagesTransform();
    }
});

// 鼠标释放事件
document.addEventListener('mouseup', () => {
    if (comparisonState.isDragging) {
        comparisonState.isDragging = false;
        comparisonState.isHandleDragging = false;
        container.classList.remove('dragging');
        container.classList.remove('image-dragging');
    }

    if (splitState.isDragging) {
        splitState.isDragging = false;

        // 恢复鼠标样式
        beforeImage.style.cursor = 'grab';
        afterImage.style.cursor = 'grab';
    }
});

// 触摸事件支持
handle.addEventListener('touchstart', (e) => {
    if (currentMode !== 'comparison') return;

    comparisonState.isDragging = true;
    comparisonState.isHandleDragging = true;
    container.classList.add('dragging');
    e.preventDefault();
});

imageContainer.addEventListener('touchstart', (e) => {
    if (currentMode !== 'comparison') return;
    if (comparisonState.isHandleDragging) return;

    comparisonState.isDragging = true;
    const rect = container.getBoundingClientRect();
    const clickPosition = e.touches[0].clientX - rect.left;
    comparisonState.percentage = (clickPosition / rect.width) * 100;

    // 更新分割位置
    beforeImage.style.clipPath = `inset(0 0 0 ${comparisonState.percentage}%)`;
    handle.style.left = `${comparisonState.percentage}%`;

    container.classList.add('image-dragging');
    e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
    if (!comparisonState.isDragging || currentMode !== 'comparison') return;

    const rect = container.getBoundingClientRect();
    const xPos = Math.min(Math.max(e.touches[0].clientX - rect.left, 0), rect.width);
    comparisonState.percentage = (xPos / rect.width) * 100;

    requestAnimationFrame(() => {
        beforeImage.style.clipPath = `inset(0 0 0 ${comparisonState.percentage}%)`;
        handle.style.left = `${comparisonState.percentage}%`;
    });

    e.preventDefault();
}, {passive: false});

document.addEventListener('touchend', () => {
    if (comparisonState.isDragging) {
        comparisonState.isDragging = false;
        comparisonState.isHandleDragging = false;
        container.classList.remove('dragging');
        container.classList.remove('image-dragging');
    }
});

// 窗口尺寸变化监听
window.addEventListener('resize', () => {
    if (currentMode === 'comparison') {
        beforeImage.style.clipPath = `inset(0 0 0 ${comparisonState.percentage}%)`;
        handle.style.left = `${comparisonState.percentage}%`;
    } else if (currentMode === 'fade') {
        afterImage.style.opacity = fadeState.opacity / 100; // 修改为 afterImage
    }
    // split模式保持现有变换
});

// 初始化模式
switchMode('comparison');

// 设置初始鼠标样式
splitContainers.forEach(container => {
    container.style.cursor = 'grab';
});