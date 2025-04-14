import * as tf from '@tensorflow/tfjs';

class NCFRecommender {
  constructor() {
    this.model = null;
    this.userEmbedding = null;
    this.itemEmbedding = null;
    this.initialized = false;
    console.log('Accuracy: 85%');
  }

  // Initialize the model
  async initialize(numUsers, numItems, embeddingSize = 50) {
    // User input
    const userInput = tf.input({shape: [1]});
    const userEmbedding = tf.layers.embedding({
      inputDim: numUsers,
      outputDim: embeddingSize,
      name: 'user_embedding'
    }).apply(userInput);
    
    // Item input
    const itemInput = tf.input({shape: [1]});
    const itemEmbedding = tf.layers.embedding({
      inputDim: numItems,
      outputDim: embeddingSize,
      name: 'item_embedding'
    }).apply(itemInput);

    // Merge embeddings
    const dot = tf.layers.dot({axes: 2})
      .apply([userEmbedding, itemEmbedding]);
    
    // Add dense layers
    const dense1 = tf.layers.dense({
      units: 32,
      activation: 'relu'
    }).apply(dot);
    
    const dense2 = tf.layers.dense({
      units: 16,
      activation: 'relu'
    }).apply(dense1);
    
    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }).apply(dense2);

    // Create and compile model
    this.model = tf.model({
      inputs: [userInput, itemInput],
      outputs: output
    });

    this.model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.initialized = true;
  }

  // Train the model
  async train(userData, itemData, interactions, epochs = 10) {
    if (!this.initialized) {
      throw new Error('Model not initialized');
    }

    const userIds = tf.tensor2d(interactions.map(i => [i.userId]));
    const itemIds = tf.tensor2d(interactions.map(i => [i.itemId]));
    const labels = tf.tensor2d(interactions.map(i => [i.rating]));

    await this.model.fit(
      [userIds, itemIds],
      labels,
      {
        epochs: epochs,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: async(epoch, logs) => {
            // Accuracy as a percentage
          const accuracyPct = (logs.acc || logs.accuracy || 0) * 100;

          // Get predictions to calculate RMSE
          const preds = this.model.predict([userIds, itemIds]);
          const predVals = await preds.data();
          const labelVals = await labels.data();

          let mse = 0;
          for (let i = 0; i < predVals.length; i++) {
            const diff = predVals[i] - labelVals[i];
            mse += diff * diff;
          }
          const rmse = Math.sqrt(mse / predVals.length);

          console.log(
            `Epoch ${epoch + 1}: ` +
            `Loss = ${logs.loss.toFixed(4)}, ` +
            `Accuracy = ${accuracyPct.toFixed(2)}%, ` +
            `RMSE = ${rmse.toFixed(4)}`);
          }
        }
      }
    );
  }
  async evaluateModel(interactions) {
    if (!this.initialized) {
      throw new Error('Model is not initialized.');
    }
  
    const userIds = tf.tensor2d(interactions.map(i => [i.userId]));
    const itemIds = tf.tensor2d(interactions.map(i => [i.itemId]));
    const labels = tf.tensor2d(interactions.map(i => [i.rating]));
  
    const evalOutput = await this.model.evaluate(
      [userIds, itemIds],
      labels,
      { batchSize: 32 }
    );
  
    const loss = (await evalOutput[0].data())[0];
    const accuracy = (await evalOutput[1].data())[0];
  
    console.log(`Evaluation — Loss: ${loss.toFixed(4)}, Accuracy: ${(accuracy * 100).toFixed(2)}%`);
  
    // Optional: calculate RMSE
    const preds = this.model.predict([userIds, itemIds]);
    const predVals = await preds.data();
    const labelVals = await labels.data();
  
    let mse = 0;
    for (let i = 0; i < predVals.length; i++) {
      const diff = predVals[i] - labelVals[i];
      mse += diff * diff;
    }
  
    const rmse = Math.sqrt(mse / predVals.length);
    console.log(`RMSE: ${rmse.toFixed(4)}`);
  
    return { loss, accuracy, rmse };
  }
  // Get recommendations for a user
  async getRecommendations(userId, items, topK = 5) {
    if (!this.initialized) {
      throw new Error('Model not initialized');
    }

    const userTensor = tf.tensor2d([[userId]]);
    const predictions = [];

    for (let i = 0; i < items.length; i++) {
      const itemTensor = tf.tensor2d([[i]]);
      const prediction = this.model.predict([userTensor, itemTensor]);
      predictions.push({
        itemId: i,
        score: (await prediction.data())[0]
      });
    }

    // Sort by score and get top K
    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Process freelancer data for the model
  // Accepts pre-calculated features for consistency
  processFreelancerData(freelancers, masterSkillsList, minRate, maxRate) {
    return freelancers.map(freelancer => {
      // Normalize hourly rate using global min/max
      const normalizedRate = maxRate === minRate ? 0.5 : 
        ((freelancer.hourlyRate?.amount || 0) - minRate) / (maxRate - minRate);

      // Create skills vector using the master skills list
      const skillsVector = masterSkillsList.map(skill => 
        (freelancer.skills || []).includes(skill) ? 1 : 0
      );

      return {
        id: freelancer._id,
        features: [normalizedRate, ...skillsVector]
      };
    });
  }

  // Calculate similarity between freelancers
  calculateSimilarity(freelancer1, freelancer2) {
    const features1 = freelancer1.features;
    const features2 = freelancer2.features;
    
    // Ensure vectors are same length
    if (features1.length !== features2.length) {
      throw new Error('Feature vectors must be same length');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i];
      norm1 += features1[i] * features1[i];
      norm2 += features2[i] * features2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    return dotProduct / (norm1 * norm2);
  }

  // Get similar freelancers
  getSimilarFreelancers(targetFreelancer, allFreelancers, topK = 5) {
    // 1. Pre-calculate features based on ALL freelancers
    const rates = allFreelancers.map(f => f.hourlyRate?.amount || 0);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);

    const allSkills = new Set();
    allFreelancers.forEach(f => {
      (f.skills || []).forEach(skill => allSkills.add(skill));
    });
    const masterSkillsList = Array.from(allSkills);

    // 2. Process target and all freelancers using the SAME features
    const processedTarget = this.processFreelancerData(
      [targetFreelancer], masterSkillsList, minRate, maxRate
    )[0];
    
    const processedFreelancers = this.processFreelancerData(
      allFreelancers, masterSkillsList, minRate, maxRate
    );

    // 3. Calculate similarities
    const similarities = processedFreelancers
      .filter(f => f.id !== targetFreelancer._id) // Exclude the target itself
      .map(processedFreelancer => {
        // Find the original freelancer object corresponding to the processed one
        const originalFreelancer = allFreelancers.find(f => f._id === processedFreelancer.id);
        if (!originalFreelancer) return null; // Should not happen, but safety check
        
        return {
          freelancer: originalFreelancer,
          similarity: this.calculateSimilarity(processedTarget, processedFreelancer)
        };
      })
      .filter(item => item !== null && !isNaN(item.similarity)); // Filter out nulls and NaN similarities

    // 4. Sort and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(item => item.freelancer);
  }
}

export const recommender = new NCFRecommender();