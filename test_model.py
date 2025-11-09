"""Quick test to verify TFLite model loads and runs"""
import sys
from pathlib import Path

try:
    # Try TensorFlow Lite
    import tensorflow as tf
    import numpy as np
    from PIL import Image
    
    print("✅ TensorFlow imported successfully")
    print(f"   Version: {tf.__version__}")
    
    # Check model exists
    model_path = Path(__file__).parent / 'assets' / 'models' / 'rip_current_model.tflite'
    if not model_path.exists():
        print(f"❌ Model not found at: {model_path}")
        sys.exit(1)
    
    print(f"✅ Model found at: {model_path}")
    print(f"   Size: {model_path.stat().st_size / 1024 / 1024:.2f} MB")
    
    # Load model
    interpreter = tf.lite.Interpreter(model_path=str(model_path))
    interpreter.allocate_tensors()
    print("✅ Model loaded successfully")
    
    # Check input/output details
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    print("\n📥 Input Details:")
    for i, detail in enumerate(input_details):
        print(f"   [{i}] Shape: {detail['shape']}, Type: {detail['dtype']}")
    
    print("\n📤 Output Details:")
    for i, detail in enumerate(output_details):
        print(f"   [{i}] Shape: {detail['shape']}, Type: {detail['dtype']}")
    
    # Create dummy input
    inp = input_details[0]
    _, h, w, c = inp['shape']
    print(f"\n🎯 Creating test input: {h}x{w}x{c}")
    
    # Create random RGB image
    test_img = np.random.rand(h, w, c).astype(np.float32)
    test_input = np.expand_dims(test_img, axis=0).astype(inp['dtype'])
    
    # Run inference
    print("🚀 Running test inference...")
    interpreter.set_tensor(inp['index'], test_input)
    interpreter.invoke()
    
    output = interpreter.get_tensor(output_details[0]['index'])
    print(f"✅ Inference successful!")
    print(f"   Output shape: {output.shape}")
    print(f"   Output range: [{np.min(output):.4f}, {np.max(output):.4f}]")
    
    print("\n✅ ALL TESTS PASSED - Model is ready to use!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("   Try: pip install tensorflow pillow numpy")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
