// 全局变量，用于存储用户上传的图片对象（URL 或 Blob）
let USER_LAYERS_DATA = {};
let LAYER_ORDER = []; // 动态确定的图层顺序

// --- 初始化 DOM 元素 ---
const canvas = document.getElementById('nftCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const generateAllBtn = document.getElementById('generateAllBtn');
const downloadBtn = document.getElementById('downloadBtn');
const traitList = document.getElementById('traitList');
const loadResourcesBtn = document.getElementById('loadResourcesBtn');
const layerInputs = document.getElementById('layerInputs');
const statusMessage = document.getElementById('statusMessage');

// 尺寸设置元素
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const applySizeBtn = document.getElementById('applySizeBtn');

// 模态框元素
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');

// 全局变量
let GENERATED_NFTS = []; // 存储所有生成的NFT数据

// --- 动态添加/移除图层输入框 ---

let layerCounter = 1;

function addLayer() {
    layerCounter++;
    const group = document.createElement('div');
    group.className = 'layer-group';
    group.setAttribute('data-layer-id', layerCounter);
    group.innerHTML = `
        <input type="text" placeholder="图层名称 (如: Hat)" class="layer-name">
        <input type="file" class="layer-files" multiple accept="image/png">
        <input type="text" placeholder="特征列表 (如: red,blue,green)" class="trait-list">
        <button class="remove-layer" onclick="removeLayer(this)">移除</button>
    `;
    layerInputs.appendChild(group);

    // 检查当前的加载方式，并设置新图层组的输入显示
    const selectedLoadMethod = document.querySelector('input[name="loadMethod"]:checked').value;
    const isPathMethod = selectedLoadMethod === 'path';

    const fileInput = group.querySelector('.layer-files');
    const traitInput = group.querySelector('.trait-list');

    fileInput.style.display = isPathMethod ? 'none' : 'block';
    traitInput.style.display = isPathMethod ? 'block' : 'none';
}

function removeLayer(button) {
    const group = button.closest('.layer-group');
    if (group) {
        group.remove();
    }
}

// --- 加载方式切换逻辑 ---

const loadMethodRadios = document.querySelectorAll('input[name="loadMethod"]');
const pathConfig = document.getElementById('pathConfig');
const layerFilesInputs = document.querySelectorAll('.layer-files');
const traitListInputs = document.querySelectorAll('.trait-list');

loadMethodRadios.forEach(radio => {
    radio.addEventListener('change', function () {
        const isPathMethod = this.value === 'path';

        // 显示/隐藏路径配置
        pathConfig.style.display = isPathMethod ? 'block' : 'none';

        // 更新所有图层组的输入显示
        const layerGroups = document.querySelectorAll('.layer-group');
        layerGroups.forEach(group => {
            const fileInput = group.querySelector('.layer-files');
            const traitInput = group.querySelector('.trait-list');

            fileInput.style.display = isPathMethod ? 'none' : 'block';
            traitInput.style.display = isPathMethod ? 'block' : 'none';
        });
    });
});

// --- 辅助函数：更新状态消息 ---
function updateStatusMessage(message, type = 'info') {
    statusMessage.textContent = message;

    // 移除所有现有类
    statusMessage.className = '';

    // 添加类型类
    statusMessage.classList.add('status-message', `status-${type}`);

    // 添加动画类
    statusMessage.classList.add('fade-in');

    // 清除动画类以允许重新触发
    setTimeout(() => {
        statusMessage.classList.remove('fade-in');
    }, 500);
}

// --- 资源加载逻辑 ---

loadResourcesBtn.addEventListener('click', async () => {
    updateStatusMessage('正在加载资源...', 'loading');
    generateBtn.disabled = true;
    downloadBtn.disabled = true;

    USER_LAYERS_DATA = {};
    LAYER_ORDER = [];
    let loadCount = 0;
    let totalTraits = 0;

    // 获取当前选择的加载方式
    const selectedLoadMethod = document.querySelector('input[name="loadMethod"]:checked').value;

    const layerGroups = document.querySelectorAll('.layer-group');

    for (const group of layerGroups) {
        const layerNameInput = group.querySelector('.layer-name');
        const layerName = layerNameInput.value.trim();

        if (!layerName) {
            console.warn(`跳过空的图层名称`);
            continue;
        }

        // 将图层名加入顺序数组
        LAYER_ORDER.push(layerName);
        USER_LAYERS_DATA[layerName] = [];

        if (selectedLoadMethod === 'upload') {
            // 上传文件方式
            const fileInput = group.querySelector('.layer-files');
            const files = fileInput.files;

            if (files.length === 0) {
                console.warn(`图层 ${layerName} 未选择文件`);
                continue;
            }

            // 遍历所有上传的文件
            for (const file of files) {
                totalTraits++;
                // 使用 FileReader 将文件对象转换为 Data URL，供 Image 对象使用
                const reader = new FileReader();

                // 使用 Promise 封装异步读取操作
                const dataUrl = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });

                // 存储特征信息: { name: 文件名, url: Data URL }
                USER_LAYERS_DATA[layerName].push({
                    name: file.name.replace(/\.[^/.]+$/, ""), // 移除文件扩展名作为特征名
                    url: dataUrl
                });
                loadCount++;
            }
        } else {
            // 路径拼接方式
            const traitListInput = group.querySelector('.trait-list');
            const traitListText = traitListInput.value.trim();

            if (!traitListText) {
                console.warn(`图层 ${layerName} 未填写特征列表`);
                continue;
            }

            // 获取路径配置
            const pathPrefix = document.getElementById('pathPrefix').value.trim();
            const filenameFormat = document.getElementById('filenameFormat').value.trim() || '{layer}_{trait}.png';

            // 解析特征列表
            const traits = traitListText.split(',').map(trait => trait.trim()).filter(trait => trait);

            if (traits.length === 0) {
                console.warn(`图层 ${layerName} 特征列表为空`);
                continue;
            }

            // 生成特征信息
            for (const trait of traits) {
                totalTraits++;
                // 拼接图片路径
                let imageUrl = pathPrefix + filenameFormat;
                imageUrl = imageUrl.replace('{layer}', layerName);
                imageUrl = imageUrl.replace('{trait}', trait);

                // 存储特征信息: { name: 特征名, url: 拼接后的路径 }
                USER_LAYERS_DATA[layerName].push({
                    name: trait,
                    url: imageUrl
                });
                loadCount++;
            }
        }
    }

    if (loadCount > 0) {
        // 计算组合数
        const totalCombinations = calculateTotalCombinations();

        updateStatusMessage(`✅ 成功加载 ${LAYER_ORDER.length} 个图层，共 ${totalTraits} 个特征。总组合数: ${totalCombinations}`, 'success');
        generateBtn.disabled = false;
        generateAllBtn.disabled = false;
        // 自动生成第一个头像
        generateAndDrawNFT();
    } else {
        updateStatusMessage('❌ 未检测到有效图层和图片。', 'error');
        generateAllBtn.disabled = true;
    }
});

// --- 组合数计算函数 ---

/**
 * 计算所有可能的组合数
 * @returns {number} 总组合数
 */
function calculateTotalCombinations() {
    return LAYER_ORDER.reduce((total, layerName) => {
        const traitCount = USER_LAYERS_DATA[layerName]?.length || 0;
        return total * traitCount;
    }, 1);
}

// --- 图像生成逻辑 (与 V1 相似，但使用动态数据) ---

function selectTrait(layerName) {
    const traits = USER_LAYERS_DATA[layerName];
    // 随机选择数组中的一个特征对象
    return traits[Math.floor(Math.random() * traits.length)];
}

/**
 * 加载图像文件 (使用 Data URL 或 Blob URL)
 * @param {string} url - 图像的 Data URL 或 Blob URL
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`加载图像失败: ${url}`));
        img.src = url;
    });
}

/**
 * 核心函数：生成并绘制 NFT 头像
 */
async function generateAndDrawNFT() {
    generateBtn.disabled = true;
    downloadBtn.disabled = true;

    // 显示生成中的状态消息
    updateStatusMessage('正在生成 NFT...', 'loading');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const selectedAttributes = [];
    const imagePromises = [];

    // 2. 遍历图层并加载图像
    for (const layer of LAYER_ORDER) {
        if (!USER_LAYERS_DATA[layer] || USER_LAYERS_DATA[layer].length === 0) {
            continue;
        }

        const traitObject = selectTrait(layer);

        selectedAttributes.push({
            layer: layer,
            trait: traitObject.name // 使用文件名作为特征名
        });

        // 使用存储的 Data URL 进行加载
        imagePromises.push(loadImage(traitObject.url));
    }

    // 3. 并行加载所有图像并绘制
    try {
        const images = await Promise.all(imagePromises);

        images.forEach(img => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        });

        updateTraitList(selectedAttributes);
        downloadBtn.disabled = false;

        // 生成成功消息
        updateStatusMessage('✅ NFT 生成成功！', 'success');

    } catch (error) {
        console.error("生成失败:", error);
        updateStatusMessage('❌ 生成失败，请检查控制台错误。', 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

/**
 * 更新页面上显示的特征列表
 */
function updateTraitList(attributes) {
    traitList.innerHTML = '';
    attributes.forEach(attr => {
        const li = document.createElement('li');
        li.textContent = `${attr.layer}: ${attr.trait}`;
        traitList.appendChild(li);
    });
}

/**
 * 下载生成的 Canvas 图像
 */
function downloadNFT() {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `custom_nft_avatar_${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 绑定事件监听器 ---
generateBtn.addEventListener('click', generateAndDrawNFT);
generateAllBtn.addEventListener('click', generateAllNFTs);

downloadBtn.addEventListener('click', function () {
    if (GENERATED_NFTS.length > 1) {
        // 如果生成了多个NFT，提供下载选项
        const choice = confirm('检测到已生成多个NFT，是否下载所有NFT？\n\n点击"确定"下载所有NFT，点击"取消"下载当前显示的NFT。');
        if (choice) {
            downloadAllNFTs();
        } else {
            downloadNFT();
        }
    } else {
        // 只有一个NFT或没有生成，下载当前显示的NFT
        downloadNFT();
    }
});

// --- 尺寸设置函数 ---

/**
 * 更新 Canvas 尺寸
 */
function updateCanvasSize() {
    // 获取用户输入的尺寸值
    const width = parseInt(widthInput.value) || 500;
    const height = parseInt(heightInput.value) || 500;

    // 验证尺寸范围
    const validWidth = Math.max(100, Math.min(2000, width));
    const validHeight = Math.max(100, Math.min(2000, height));

    // 更新输入框显示的有效值
    widthInput.value = validWidth;
    heightInput.value = validHeight;

    // 更新 Canvas 尺寸
    canvas.width = validWidth;
    canvas.height = validHeight;

    // 清除 Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 如果已经加载了资源，重新生成 NFT
    if (LAYER_ORDER.length > 0 && Object.keys(USER_LAYERS_DATA).length > 0) {
        generateAndDrawNFT();
    }

    // 显示状态消息
    updateStatusMessage(`✅ Canvas 尺寸已更新为 ${validWidth}x${validHeight}`, 'success');
}

// --- 页面加载初始化 ---// 初始化：禁用生成按钮，直到资源加载完成
generateBtn.disabled = true;

// 页面加载时初始化图层组的输入显示
window.addEventListener('DOMContentLoaded', function () {
    const selectedLoadMethod = document.querySelector('input[name="loadMethod"]:checked').value;
    const isPathMethod = selectedLoadMethod === 'path';

    // 初始化路径配置的显示状态
    pathConfig.style.display = isPathMethod ? 'block' : 'none';

    // 初始化所有图层组的输入显示
    const layerGroups = document.querySelectorAll('.layer-group');
    layerGroups.forEach(group => {
        const fileInput = group.querySelector('.layer-files');
        const traitInput = group.querySelector('.trait-list');

        fileInput.style.display = isPathMethod ? 'none' : 'block';
        traitInput.style.display = isPathMethod ? 'block' : 'none';
    });
});

// --- 生成所有NFT的核心逻辑 ---

/**
 * 生成所有可能的特征组合
 * @returns {Array} 所有可能的特征组合数组
 */
function generateAllCombinations() {
    if (LAYER_ORDER.length === 0) return [];

    let combinations = [[]];

    for (const layerName of LAYER_ORDER) {
        const traits = USER_LAYERS_DATA[layerName] || [];
        const newCombinations = [];

        for (const combination of combinations) {
            for (const trait of traits) {
                newCombinations.push([...combination, { layer: layerName, trait: trait }]);
            }
        }

        combinations = newCombinations;
    }

    return combinations;
}

/**
 * 绘制单个NFT组合
 * @param {Array} combination - 特征组合数组
 * @returns {Promise<string>} 生成的图像Data URL
 */
async function drawSingleNFT(combination) {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制每个特征
    const imagePromises = combination.map(item => {
        return loadImage(item.trait.url);
    });

    const images = await Promise.all(imagePromises);

    images.forEach(img => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    });

    // 返回Data URL
    return canvas.toDataURL('image/png');
}

/**
 * 生成所有NFT
 */
async function generateAllNFTs() {
    const totalCombinations = calculateTotalCombinations();

    // 显示确认对话框
    if (!confirm(`确定要生成所有 ${totalCombinations} 个NFT并下载吗？这可能需要一些时间。`)) {
        return;
    }

    // 更新按钮状态
    generateAllBtn.disabled = true;
    generateBtn.disabled = true;
    downloadBtn.disabled = true;

    // 生成所有组合
    const allCombinations = generateAllCombinations();
    GENERATED_NFTS = [];

    // 显示生成进度
    updateStatusMessage(`🔄 正在生成所有NFT... 0/${totalCombinations}`, 'loading');

    try {
        // 依次生成每个NFT
        for (let i = 0; i < allCombinations.length; i++) {
            const combination = allCombinations[i];

            // 绘制NFT并获取Data URL
            const dataUrl = await drawSingleNFT(combination);

            // 生成文件名：使用图层名称和特征名称拼接
            const filename = generateNFTFilename(combination);

            // 存储生成的NFT数据
            GENERATED_NFTS.push({
                id: i + 1,
                combination: combination,
                dataUrl: dataUrl,
                filename: filename
            });

            // 更新进度
            updateStatusMessage(`🔄 正在生成所有NFT... ${i + 1}/${totalCombinations}`, 'loading');

            // 短暂延迟，避免浏览器崩溃
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // 生成完成，自动下载
        updateStatusMessage(`✅ 成功生成 ${GENERATED_NFTS.length} 个NFT！正在准备下载...`, 'success');

        // 自动下载所有NFT
        await downloadAllNFTs();

        // 启用下载按钮
        downloadBtn.disabled = false;

    } catch (error) {
        console.error('生成所有NFT失败:', error);
        updateStatusMessage(`❌ 生成所有NFT失败: ${error.message}`, 'error');
    } finally {
        // 恢复按钮状态
        generateAllBtn.disabled = false;
        generateBtn.disabled = false;
    }
}

/**
 * 生成NFT文件名：使用图层名称和特征名称拼接
 * @param {Array} combination - 特征组合数组
 * @returns {string} 生成的文件名
 */
function generateNFTFilename(combination) {
    // 从组合中提取每个图层的特征名称，按图层顺序拼接
    const filenameParts = [];

    combination.forEach(item => {
        filenameParts.push(item.trait.name);
    });

    // 使用下划线拼接所有特征名称
    return `${filenameParts.join('_')}.png`;
}

// --- 批量下载功能 ---

/**
 * 下载所有生成的NFT
 */
async function downloadAllNFTs() {
    if (GENERATED_NFTS.length === 0) {
        alert('没有生成任何NFT，请先点击"生成所有"按钮。');
        return;
    }

    updateStatusMessage(`🔄 正在准备下载... 正在创建zip文件`, 'loading');

    try {
        // 创建JSZip实例
        const zip = new JSZip();

        // 将每个NFT添加到zip文件中
        for (let i = 0; i < GENERATED_NFTS.length; i++) {
            const nft = GENERATED_NFTS[i];

            // 更新进度
            updateStatusMessage(`🔄 正在准备下载... ${i + 1}/${GENERATED_NFTS.length}`, 'loading');

            // 从Data URL中提取二进制数据
            const base64Data = nft.dataUrl.split(',')[1];

            // 将数据添加到zip文件
            zip.file(nft.filename, base64Data, { base64: true });

            // 短暂延迟，避免浏览器阻塞
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        // 生成zip文件
        updateStatusMessage(`🔄 正在生成zip文件...`, 'loading');
        const zipContent = await zip.generateAsync({ type: 'blob' });

        // 创建下载链接
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipContent);
        link.download = `nft_collection.zip`;

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 释放URL对象
        URL.revokeObjectURL(link.href);

        // 下载完成
        updateStatusMessage(`✅ 成功下载 ${GENERATED_NFTS.length} 个NFT到zip文件！`, 'success');

    } catch (error) {
        console.error('下载所有NFT失败:', error);
        updateStatusMessage(`❌ 下载所有NFT失败: ${error.message}`, 'error');
    }
}

// --- 绑定尺寸设置事件监听器 ---// 应用尺寸按钮点击事件
applySizeBtn.addEventListener('click', updateCanvasSize);

// --- 模态框控制逻辑 ---

/**
 * 显示模态框
 */
function showModal() {
    modalOverlay.style.display = 'block';
    settingsPanel.style.display = 'block';
    // 禁用背景滚动
    document.body.style.overflow = 'hidden';
}

/**
 * 隐藏模态框
 */
function hideModal() {
    modalOverlay.style.display = 'none';
    settingsPanel.style.display = 'none';
    // 启用背景滚动
    document.body.style.overflow = 'auto';
    // 恢复设置按钮文本
    settingsBtn.innerHTML = '⚙️ 设置';
}

// 设置按钮点击事件 - 显示模态框
settingsBtn.addEventListener('click', function () {
    showModal();
    // 更新按钮文本
    settingsBtn.textContent = '⚙️ 设置';
});

// 关闭模态框按钮点击事件
closeModalBtn.addEventListener('click', hideModal);

// 背景遮罩点击事件 - 关闭模态框
modalOverlay.addEventListener('click', hideModal);

// 应用尺寸后自动关闭模态框
const originalUpdateCanvasSize = updateCanvasSize;
updateCanvasSize = function () {
    originalUpdateCanvasSize();
    // 应用尺寸后延迟关闭模态框，让用户看到状态消息
    setTimeout(hideModal, 800);
};