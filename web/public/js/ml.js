import {PLANT_LIST} from './plantlist.js';

var done = document.getElementById('done');

const IMAGE_SIZE = 300;
const TOPK_PREDICTIONS = 11;

/* model execute */
const demo = async () => {
    status('Loading model...');

    /* model loading */
    const model = await tf.loadLayersModel('https://storage.googleapis.com/plant-recognizer/model_v2/model3.json');
    console.log('Successfully loaded model')
    /* model prediction with set image size */
    //model.predict(tf.zeros([null, IMAGE_SIZE, IMAGE_SIZE, 3])).dispose();
    status('');

    const image = document.getElementById('img-preview');
    if (image.complete && image.naturalHeight !== 0) {
        await predict(model, image);
    } else {
        image.onload = () => {
            predict(model, image);
        }
    }
};


/* model predict and time calculating */
async function predict(model, imgElement) {
    status('Predicting...');

    const startTime1 = performance.now();
    let startTime2;

    const logits = tf.tidy(() => {
        const img = tf.browser.fromPixels(imgElement).toFloat();

        const offset = tf.scalar(127.5);
        const normalized = img.sub(offset).div(offset);
        
        const batched = tf.image.resizeBilinear(
            normalized,
            [IMAGE_SIZE, IMAGE_SIZE],
            false
          ).expandDims(0);
        console.log(batched.shape);
        startTime2 = performance.now();
        
        return model.predict(batched);
    });

    const classes = await getTopKClasses(logits, TOPK_PREDICTIONS);
    const totalTime1 = performance.now() - startTime1;
    const totalTime2 = performance.now() - startTime2;
    status(`Done in ${Math.floor(totalTime1)} ms` +
            `(not including preprocessing: ${Math.floor(totalTime2)} ms)`);

    showResults(imgElement, classes);
}

/* Find Top n classes */
export async function getTopKClasses(logits, topK) {
    const values = await logits.data();

    const valuesAndIndices = [];
    for (let i = 0; i < values.length; i++) {
        valuesAndIndices.push({value: values[i], index: i});
    }
    valuesAndIndices.sort((a, b) => {
        return b.value - a.value;
    });
    const topkValues = new Float32Array(topK);
    const topkIndices = new Int32Array(topK);
    for (let i = 0; i < topK; i++) {
        topkValues[i] = valuesAndIndices[i].value;
        topkIndices[i] = valuesAndIndices[i].index;
    }

    const topClassesAndProbs = [];
    for (let i = 0; i < topkIndices.length; i++) {
        topClassesAndProbs.push({
            className: PLANT_LIST[topkIndices[i]],
            probability: topkValues[i]
        })
    }
    return topClassesAndProbs;
}


/* insert result to each div */
function showResults(imgElement, classes) {
    const predictionContainer = document.createElement('div');
    predictionContainer.className = 'pred-container';

    const imgContainer = document.createElement('div');
    imgContainer.appendChild(imgElement);
    predictionContainer.appendChild(imgContainer);

    const probsContainer = document.createElement('div');
    for (let i = 0; i < classes.length; i++) {
        const row = document.createElement('div');
        row.className = 'row';

        const classElement = document.createElement('div');
        classElement.className = 'cell';
        classElement.innerText = classes[i].className;
        row.appendChild(classElement);

        const probsElement = document.createElement('div');
        probsElement.className = 'cell';
        probsElement.innerText = classes[i].probability.toFixed(3);
        row.appendChild(probsElement);

        probsContainer.appendChild(row);
    }
    predictionContainer.appendChild(probsContainer);

    predictionsElement.insertBefore(predictionContainer, predictionsElement.firstChild);
}

const demoStatusElement = document.getElementById('status');
/* status message print */
const status = msg => demoStatusElement.innerText = msg;

const predictionsElement = document.getElementById('predictions');


/* execute */
done.onclick = function() {
    console.log('done...');
    demo();
}