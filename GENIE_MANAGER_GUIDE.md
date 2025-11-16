# 🧞 Genie Manager Feature Guide

The Genie Manager allows administrators to customize the floating genie mascot on the homepage, including uploading custom images and controlling animations.

## ✨ Features

### 1. **Custom Genie Image Upload**
- Upload your own genie mascot image
- Supports PNG, JPG, GIF formats
- Maximum file size: 5MB
- Images are stored in Firebase Storage

### 2. **Animation Controls**
Choose from 5 animation types:
- **Float** - Gentle up and down movement (default)
- **Bounce** - More energetic bouncing motion
- **Pulse** - Scale in and out effect
- **Spin** - 360-degree rotation
- **None** - No animation (static)

### 3. **Customization Options**
- **Animation Duration**: 1-10 seconds
- **Animation Delay**: 0-5 seconds (delay before animation starts)
- **Background Opacity**: 0-100% (for the blurred background genie)
- **Size**: Small, Medium, or Large

### 4. **Live Preview**
- Real-time preview of your changes
- See exactly how it will look on the homepage
- Test different animations before saving

## 🚀 How to Use

### Access Genie Manager

1. **Login as Admin**:
   - Email: `admin@afrogenie.com`
   - Password: `Admin123456!`

2. **Navigate to Genie Settings**:
   - Go to the admin panel: `http://localhost:3000/#/admin`
   - Click **"Genie Settings"** in the sidebar (last option)

### Upload a New Genie Image

1. Click the **file upload button**
2. Select your image file (PNG, JPG, or GIF)
3. Wait for upload to complete
4. See the preview update automatically
5. Click **"Save Settings"** to apply changes

### Customize Animation

1. **Choose Animation Type**: Select from the dropdown
2. **Adjust Duration**: Use the slider (1-10 seconds)
3. **Set Delay**: Use the slider (0-5 seconds)
4. **Change Opacity**: Adjust background visibility (0-100%)
5. **Select Size**: Choose Small, Medium, or Large
6. **Preview**: Watch the live preview on the right
7. **Save**: Click "Save Settings" when satisfied

## 📊 Settings Breakdown

### Animation Types Explained

#### Float (Default)
```
Smooth vertical movement
Best for: Gentle, friendly feel
Duration suggestion: 3-5 seconds
```

#### Bounce
```
More energetic up/down motion
Best for: Playful, dynamic feel
Duration suggestion: 2-3 seconds
```

#### Pulse
```
Scales larger and smaller
Best for: Drawing attention
Duration suggestion: 2-4 seconds
```

#### Spin
```
Continuous rotation
Best for: Fun, whimsical feel
Duration suggestion: 5-10 seconds
```

#### None
```
No animation at all
Best for: Clean, professional look
```

### Size Guidelines

| Size | Main Genie | Background | Best For |
|------|------------|------------|----------|
| Small | 160-192px | 192-256px | Subtle presence |
| Medium | 208-240px | 256-320px | Balanced look |
| Large | 256-288px | 320-500px | Hero emphasis |

### Opacity Tips

- **0-20%**: Very subtle background (recommended)
- **20-40%**: Noticeable but not distracting
- **40-60%**: Prominent background presence
- **60-100%**: Strong, bold background

## 🔧 Technical Details

### Database Structure

Settings are stored in Firestore:
```
Collection: genieSettings
Document: main
Fields:
  - imageUrl: string
  - animationType: 'float' | 'bounce' | 'pulse' | 'spin' | 'none'
  - animationDuration: number (seconds)
  - animationDelay: number (seconds)
  - opacity: number (0-100)
  - size: 'small' | 'medium' | 'large'
  - updatedAt: timestamp
```

### Storage Location

Images are uploaded to:
```
Firebase Storage: gs://afrogenie.firebasestorage.app/genie/
Format: genie_[timestamp]_[original_filename]
```

### Permissions

**Firestore Rules**:
- Read: Public (anyone can view settings)
- Write: Admin only

**Storage Rules**:
- Read: Public (anyone can view images)
- Write: Authenticated users (upload limited to 5MB images)

## 🎨 Best Practices

### Image Recommendations

1. **Format**: PNG with transparent background works best
2. **Dimensions**: 800x800px to 1200x1200px
3. **File Size**: Under 500KB for fast loading
4. **Style**: Match your brand colors and style
5. **Content**: Clear, recognizable mascot

### Animation Recommendations

1. **Homepage Hero**: Float or Bounce (friendly, welcoming)
2. **Special Events**: Pulse or Spin (attention-grabbing)
3. **Professional Sites**: None or Slow Float (subtle)
4. **Mobile**: Faster animations (2-3s) work better
5. **Accessibility**: Avoid very fast or distracting animations

### Performance Tips

- Optimize images before uploading
- Use WebP or PNG format
- Test on different devices
- Consider users with motion sensitivity (provide "None" option)

## 🐛 Troubleshooting

### Upload Not Working

**Issue**: Image upload fails
**Solutions**:
1. Check file size (must be < 5MB)
2. Verify file type (PNG, JPG, GIF only)
3. Ensure you're logged in as admin
4. Check browser console for errors

### Animation Not Showing

**Issue**: Animation doesn't appear on homepage
**Solutions**:
1. Click "Save Settings" after making changes
2. Hard refresh the homepage (Cmd+Shift+R / Ctrl+Shift+R)
3. Clear browser cache
4. Check that animation type isn't set to "None"

### Access Denied

**Issue**: Can't access Genie Manager
**Solutions**:
1. Verify you're logged in as admin
2. Check your role in Firestore (users collection)
3. Regular users see "Access Denied" page (this is correct)

### Settings Not Persisting

**Issue**: Settings revert after page reload
**Solutions**:
1. Make sure to click "Save Settings"
2. Wait for success message
3. Check Firebase Console for saved data
4. Verify Firestore rules are deployed

## 📱 Mobile Considerations

The genie appears on mobile devices with responsive sizing:
- Small screens: Automatically scaled down
- Touch devices: Animations may perform differently
- Always test on actual mobile devices

## 🔐 Security Notes

- Only admins can change genie settings
- All uploads are validated (size, type)
- Public can view but not modify
- Images are served via Firebase CDN (fast & secure)

## 💡 Creative Ideas

### Seasonal Themes
- Halloween: Spooky genie
- Christmas: Santa genie
- New Year: Party genie

### Brand Integration
- Match genie to logo colors
- Use brand mascot
- Coordinate with marketing campaigns

### User Engagement
- Special genies for milestones
- Community contests for best genie
- Limited-time special genies

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Firebase Console logs
3. Check browser console for errors
4. Verify all rules are properly deployed

---

**Version**: 1.0  
**Last Updated**: November 14, 2025  
**Status**: ✅ Production Ready


